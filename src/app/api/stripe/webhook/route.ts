import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { trackServerEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";

function planForPrice(priceId: string | undefined): "indie" | "studio" | "free" {
  if (priceId && (priceId === process.env.STRIPE_STUDIO_PRICE_ID || priceId === process.env.STRIPE_STUDIO_YEARLY_PRICE_ID)) return "studio";
  if (priceId && (priceId === process.env.STRIPE_INDIE_PRICE_ID || priceId === process.env.STRIPE_INDIE_YEARLY_PRICE_ID)) return "indie";
  return "free";
}

async function syncSubscription(stripe: Stripe, subscriptionId: string) {
  const admin = createAdminSupabase();
  if (!admin) throw new Error("SUPABASE_ADMIN_REQUIRED");
  const linked = await stripe.subscriptions.retrieve(subscriptionId);
  const workspaceId = linked.metadata.workspace_id;
  const customerId = typeof linked.customer === "string" ? linked.customer : linked.customer.id;
  if (!workspaceId || !customerId) throw new Error("SUBSCRIPTION_UNLINKED");
  const { data: workspace, error: lookupError } = await admin.from("workspaces")
    .select("stripe_customer_id, stripe_subscription_id, plan, subscription_status, stripe_sync_version")
    .eq("id", workspaceId).single();
  if (lookupError || !workspace || workspace.stripe_customer_id !== customerId) throw new Error("CUSTOMER_MISMATCH");
  // Read the revision before fetching the authoritative state. Otherwise a stale
  // Stripe response could be paired with a newer database revision and overwrite it.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentCustomer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  if (subscription.metadata.workspace_id !== workspaceId || currentCustomer !== customerId) throw new Error("CUSTOMER_MISMATCH");
  // A late event for an older subscription cannot overwrite the current one.
  if (workspace.stripe_subscription_id && workspace.stripe_subscription_id !== subscription.id) return;
  const priceId = subscription.items.data[0]?.price.id;
  const active = ["active", "trialing"].includes(subscription.status);
  const plan = active ? planForPrice(priceId) : "free";
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const { data: updated, error } = await admin.from("workspaces").update({
    stripe_sync_version: workspace.stripe_sync_version + 1,
    plan,
    seats: plan === "studio" ? 3 : 1,
    stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
    stripe_price_id: priceId ?? null,
    subscription_status: subscription.status,
    subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  }).eq("id", workspaceId).eq("stripe_sync_version", workspace.stripe_sync_version).select("id").maybeSingle();
  if (error || !updated) throw new Error("SUBSCRIPTION_SYNC_CONFLICT");
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN && active && plan !== "free" &&
      (workspace.plan === "free" || workspace.stripe_subscription_id !== subscription.id ||
        !["active", "trialing"].includes(workspace.subscription_status ?? ""))) {
    const { data: owner } = await admin.from("workspace_members")
      .select("user_id").eq("workspace_id", workspaceId).eq("role", "owner").limit(1).maybeSingle();
    if (owner?.user_id) {
      await trackServerEvent(admin, owner.user_id, "subscription_activated", `${subscription.id}:activated`, { plan });
    }
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
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

  const liveKey = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  if (event.livemode !== liveKey || (process.env.VERCEL_ENV === "production" && !event.livemode)) {
    return NextResponse.json({ error: "WEBHOOK_ENVIRONMENT_MISMATCH" }, { status: 400 });
  }
  const { data: marker, error: lookupError } = await admin.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "EVENT_STORE_FAILED" }, { status: 500 });
  if (marker) return NextResponse.json({ received: true, duplicate: true });

  try {
    let subscriptionId: string | undefined;
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    } else if (event.type.startsWith("customer.subscription.")) {
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    } else if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      subscriptionId = typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id;
    }
    if (subscriptionId) await syncSubscription(stripe, subscriptionId);
    const { error: markerError } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
    if (markerError && markerError.code !== "23505") throw new Error("EVENT_STORE_FAILED");
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "EVENT_PROCESSING_FAILED" }, { status: 500 });
  }
}
