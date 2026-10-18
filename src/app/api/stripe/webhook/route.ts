import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { billingEventMatches } from "@/lib/billing-environment";
import { ONE_TIME_CATALOG, PLANS, isOneTimeKind } from "@/lib/plans";
import { serverEnv } from "@/lib/env";
import { analyticsAudience } from "@/lib/analytics-audience";
import { sendUmamiServerEvent } from "@/lib/umami-server";

export const runtime = "nodejs";

function planForPrice(priceId: string | undefined): "indie" | "studio" | "free" {
  if (priceId && (priceId === serverEnv.stripe.prices.studioMonthly || priceId === serverEnv.stripe.prices.studioYearly)) return "studio";
  if (priceId && (priceId === serverEnv.stripe.prices.indieMonthly || priceId === serverEnv.stripe.prices.indieYearly)) return "indie";
  return "free";
}

/** Returns an unlinked outcome for a subscription DuoShot checkout did not create. */
async function syncSubscription(stripe: Stripe, subscriptionId: string): Promise<{ outcome: "synced" | "unlinked"; subscription?: Stripe.Subscription }> {
  const admin = createAdminSupabase();
  if (!admin) throw new Error("SUPABASE_ADMIN_REQUIRED");
  const linked = await stripe.subscriptions.retrieve(subscriptionId);
  const workspaceId = linked.metadata.workspace_id;
  const customerId = typeof linked.customer === "string" ? linked.customer : linked.customer.id;
  // The Stripe account can bill other products; retrying their events would only
  // pile up failed deliveries on this endpoint.
  if (!workspaceId || !customerId) return { outcome: "unlinked" };
  const { data: workspace, error: lookupError } = await admin.from("workspaces")
    .select("stripe_customer_id, stripe_subscription_id, plan, subscription_status, stripe_sync_version")
    .eq("id", workspaceId).maybeSingle();
  if (lookupError) throw new Error("WORKSPACE_LOOKUP_FAILED");
  // A DuoShot subscription that cannot be applied stays a failed delivery, so it is noticed.
  if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");
  if (workspace.stripe_customer_id !== customerId) throw new Error("CUSTOMER_MISMATCH");
  // Read the revision before fetching the authoritative state. Otherwise a stale
  // Stripe response could be paired with a newer database revision and overwrite it.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentCustomer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  if (subscription.metadata.workspace_id !== workspaceId || currentCustomer !== customerId) throw new Error("CUSTOMER_MISMATCH");
  // A late event for an older subscription cannot overwrite the current one.
  if (workspace.stripe_subscription_id && workspace.stripe_subscription_id !== subscription.id) return { outcome: "synced", subscription };
  const priceId = subscription.items.data[0]?.price.id;
  const active = ["active", "trialing"].includes(subscription.status);
  const plan = active ? planForPrice(priceId) : "free";
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const { data: updated, error } = await admin.from("workspaces").update({
    stripe_sync_version: workspace.stripe_sync_version + 1,
    plan,
    seats: PLANS[plan].seats,
    stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
    stripe_price_id: priceId ?? null,
    subscription_status: subscription.status,
    subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  }).eq("id", workspaceId).eq("stripe_sync_version", workspace.stripe_sync_version).select("id").maybeSingle();
  if (error || !updated) throw new Error("SUBSCRIPTION_SYNC_CONFLICT");
  return { outcome: "synced", subscription };
}

/**
 * One-time pass (Checkout mode "payment"). Granting is idempotent on the session id in
 * the database, so concurrent or repeated deliveries extend the pass only once. An
 * unpaid session (delayed payment method) waits for async_payment_succeeded.
 */
async function grantPass(session: Stripe.Checkout.Session): Promise<"synced" | "unlinked"> {
  const admin = createAdminSupabase();
  if (!admin) throw new Error("SUPABASE_ADMIN_REQUIRED");
  const workspaceId = session.metadata?.workspace_id;
  const kind = session.metadata?.kind;
  // Payments for other products on the same Stripe account are acknowledged and ignored.
  if (!workspaceId || !isOneTimeKind(kind) || session.client_reference_id !== workspaceId) return "unlinked";
  if (session.payment_status !== "paid") return "synced";
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) throw new Error("CUSTOMER_MISMATCH");
  const { error } = await admin.rpc("grant_workspace_pass", {
    p_workspace_id: workspaceId, p_session_id: session.id, p_customer_id: customerId, p_days: ONE_TIME_CATALOG[kind].days,
  });
  if (error) {
    const known = ["WORKSPACE_NOT_FOUND", "CUSTOMER_MISMATCH"].find((code) => error.message?.includes(code));
    throw new Error(known ?? "PASS_GRANT_FAILED");
  }
  return "synced";
}

/** Runs only after a successful projection and a newly inserted event marker. */
async function reportPayment(event: Stripe.Event, subscription?: Stripe.Subscription) {
  if (!event.livemode) return;
  try {
    let workspaceId: string | undefined;
    let data: Record<string, string | number | boolean>;
    if (event.type === "invoice.paid" && subscription) {
      const invoice = event.data.object as Stripe.Invoice;
      if (!(invoice.amount_paid > 0)) return;
      workspaceId = subscription.metadata.workspace_id;
      const price = subscription.items.data[0]?.price;
      data = {
        revenue: invoice.amount_paid / 100, currency: invoice.currency.toUpperCase(),
        plan: planForPrice(price?.id), interval: price?.recurring?.interval ?? "unknown",
        billing_reason: invoice.billing_reason ?? "unknown",
      };
    } else if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "payment" || session.payment_status !== "paid" || session.amount_total === null || !session.currency) return;
      workspaceId = session.metadata?.workspace_id;
      const kind = session.metadata?.kind;
      if (!isOneTimeKind(kind)) return;
      data = { revenue: session.amount_total / 100, currency: session.currency.toUpperCase(), plan: kind };
    } else { return; }
    if (!workspaceId) return;
    const admin = createAdminSupabase();
    if (!admin) return;
    const { data: owner, error } = await admin.from("workspace_members").select("user_id")
      .eq("workspace_id", workspaceId).eq("role", "owner").eq("active", true).maybeSingle();
    data.audience = !error && owner?.user_id ? analyticsAudience(owner.user_id) : "unknown";
    await sendUmamiServerEvent("payment_succeeded", data);
  } catch { console.warn("[stripe-webhook] revenue analytics unavailable"); }
}

/** Failure codes surfaced in the Stripe delivery log; anything else is generic. */
const REPORTED_FAILURES = new Set(["WORKSPACE_LOOKUP_FAILED", "WORKSPACE_NOT_FOUND", "CUSTOMER_MISMATCH", "SUBSCRIPTION_SYNC_CONFLICT", "EVENT_STORE_FAILED", "PASS_GRANT_FAILED"]);

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = serverEnv.stripe.webhookSecret;
  const admin = createAdminSupabase();
  if (!stripe || !secret || !admin) return NextResponse.json({ error: "WEBHOOK_UNCONFIGURED" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  if (!billingEventMatches(event.livemode)) {
    return NextResponse.json({ error: "WEBHOOK_ENVIRONMENT_MISMATCH" }, { status: 400 });
  }
  const { data: marker, error: lookupError } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "EVENT_STORE_FAILED" }, { status: 500 });
  if (marker) return NextResponse.json({ received: true, duplicate: true });

  try {
    let subscriptionId: string | undefined;
    let syncedSubscription: Stripe.Subscription | undefined;
    let outcome: "synced" | "unlinked" = "synced";
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") outcome = await grantPass(session);
      else subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    } else if (event.type.startsWith("customer.subscription.")) {
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    } else if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      subscriptionId = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
    }
    if (subscriptionId) {
      const result = await syncSubscription(stripe, subscriptionId);
      outcome = result.outcome;
      syncedSubscription = result.subscription;
    }
    const { error: markerError } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
    if (markerError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    if (markerError) throw new Error("EVENT_STORE_FAILED");
    if (outcome === "unlinked") {
      const ignored = event.type.startsWith("checkout.session.") && (event.data.object as Stripe.Checkout.Session).mode === "payment" ? "PAYMENT_UNLINKED" : "SUBSCRIPTION_UNLINKED";
      console.warn(`[stripe-webhook] ignored ${event.id} (${event.type}): ${ignored}`);
      return NextResponse.json({ received: true, ignored });
    }
    await reportPayment(event, syncedSubscription);
    return NextResponse.json({ received: true });
  } catch (error) {
    const reason = error instanceof Error && REPORTED_FAILURES.has(error.message) ? error.message : "EVENT_PROCESSING_FAILED";
    console.error(`[stripe-webhook] failed ${event.id} (${event.type}): ${reason}`);
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}
