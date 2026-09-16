import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { CHECKOUT_CATALOG, type CheckoutKind } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { PlanId } from "@/lib/specs";

export const runtime = "nodejs";

function planFromKind(kind: CheckoutKind | undefined): PlanId | null {
  if (!kind) return null;
  return CHECKOUT_CATALOG[kind]?.plan ?? null;
}

async function persistWorkspace(options: {
  workspaceId: string;
  plan?: PlanId;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: string | null;
}) {
  const admin = createAdminSupabase();
  if (!admin) return;
  const patch: Record<string, string | number | null> = {};
  if (options.plan) {
    patch.plan = options.plan;
    patch.seats = options.plan === "studio" ? 3 : 1;
  }
  if (options.customerId !== undefined) patch.stripe_customer_id = options.customerId;
  if (options.subscriptionId !== undefined) patch.stripe_subscription_id = options.subscriptionId;
  if (options.status !== undefined) patch.subscription_status = options.status;
  if (Object.keys(patch).length === 0) return;
  await admin.from("workspaces").update(patch).eq("id", options.workspaceId);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (!secret || !stripe) {
    return NextResponse.json({ error: "WEBHOOK_UNCONFIGURED" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 });
  }
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const workspaceId = session.metadata?.workspace_id;
    const kind = session.metadata?.kind as CheckoutKind | undefined;
    if (workspaceId) {
      const plan = planFromKind(kind) ?? "indie";
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      await persistWorkspace({
        workspaceId,
        plan,
        customerId,
        subscriptionId,
        status: "active",
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const subscription = event.data.object;
    const workspaceId = subscription.metadata?.workspace_id;
    const kind = subscription.metadata?.kind as CheckoutKind | undefined;
    if (workspaceId && ["active", "trialing"].includes(subscription.status)) {
      await persistWorkspace({
        workspaceId,
        plan: planFromKind(kind) ?? "indie",
        customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const workspaceId = subscription.metadata?.workspace_id;
    if (workspaceId) {
      await persistWorkspace({
        workspaceId,
        plan: "free",
        subscriptionId: null,
        status: "canceled",
      });
    }
  }

  return NextResponse.json({ received: true });
}
