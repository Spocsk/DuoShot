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
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const workspaceId = subscription.metadata.workspace_id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  if (!workspaceId || !customerId) throw new Error("SUBSCRIPTION_UNLINKED");
  const { data: workspace, error: lookupError } = await admin.from("workspaces")
    .select("stripe_customer_id, stripe_subscription_id, plan, subscription_status")
    .eq("id", workspaceId).single();
  if (lookupError || !workspace || workspace.stripe_customer_id !== customerId) throw new Error("CUSTOMER_MISMATCH");
  // A late event for an older subscription cannot overwrite the current one.
  if (workspace.stripe_subscription_id && workspace.stripe_subscription_id !== subscription.id) return;
  const priceId = subscription.items.data[0]?.price.id;
  const active = ["active", "trialing"].includes(subscription.status);
  const plan = active ? planForPrice(priceId) : "free";
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const { error } = await admin.from("workspaces").update({
    plan,
    seats: plan === "studio" ? 3 : 1,
    stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
    stripe_price_id: priceId ?? null,
    subscription_status: subscription.status,
    subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  }).eq("id", workspaceId);
  if (error) throw error;
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

  const { error: markerError } = await admin.from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (markerError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (markerError) return NextResponse.json({ error: "EVENT_STORE_FAILED" }, { status: 500 });

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
    return NextResponse.json({ received: true });
  } catch {
    await admin.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "EVENT_PROCESSING_FAILED" }, { status: 500 });
  }
}
