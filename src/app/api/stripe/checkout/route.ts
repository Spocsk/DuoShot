import { NextResponse } from "next/server";
import { CHECKOUT_CATALOG, type CheckoutKind } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

function safeNextPath(value: unknown): string {
  return value === "/en/tool" ? "/en/tool" : "/tool";
}

function priceIdFor(kind: CheckoutKind): string | undefined {
  switch (kind) {
    case "indie_monthly": return process.env.STRIPE_INDIE_PRICE_ID;
    case "studio_monthly": return process.env.STRIPE_STUDIO_PRICE_ID;
    case "indie_yearly": return process.env.STRIPE_INDIE_YEARLY_PRICE_ID;
    case "studio_yearly": return process.env.STRIPE_STUDIO_YEARLY_PRICE_ID;
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { kind?: string; next?: string };
  if (!body.kind || !(body.kind in CHECKOUT_CATALOG)) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }
  const kind = body.kind as CheckoutKind;
  const priceId = priceIdFor(kind);
  const stripe = getStripe();
  const admin = createAdminSupabase();
  if (!stripe || !priceId || !admin) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") && process.env.STRIPE_LIVE_ENABLED !== "true") {
    return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
  }

  const { data: membership } = await supabase.from("workspace_members")
    .select("workspace_id, role").eq("user_id", user.id).eq("active", true).limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "BILLING_OWNER_REQUIRED" }, { status: 403 });
  }
  const { data: workspace } = await supabase.from("workspaces")
    .select("stripe_customer_id, stripe_subscription_id").eq("id", membership.workspace_id).single();
  if (!workspace) return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });

  let customerId = workspace.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { workspace_id: membership.workspace_id },
    }, { idempotencyKey: `duoshot-customer-${membership.workspace_id}` });
    customerId = customer.id;
    const { data: linked, error } = await admin.from("workspaces").update({ stripe_customer_id: customerId })
      .eq("id", membership.workspace_id).is("stripe_customer_id", null).select("stripe_customer_id").maybeSingle();
    if (error) return NextResponse.json({ error: "BILLING_LINK_FAILED" }, { status: 500 });
    if (!linked) {
      const { data: current } = await admin.from("workspaces").select("stripe_customer_id")
        .eq("id", membership.workspace_id).single();
      if (!current?.stripe_customer_id) return NextResponse.json({ error: "BILLING_LINK_FAILED" }, { status: 500 });
      customerId = current.stripe_customer_id;
    }
  }
  if (!customerId) return NextResponse.json({ error: "BILLING_LINK_FAILED" }, { status: 500 });

  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  if (subscriptions.data.some((subscription) => !["canceled", "incomplete_expired"].includes(subscription.status)) || workspace.stripe_subscription_id) {
    return NextResponse.json({ error: "SUBSCRIPTION_EXISTS", manageUrl: "/api/stripe/portal" }, { status: 409 });
  }

  const origin = getSiteUrl();
  const nextPath = safeNextPath(body.next);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: membership.workspace_id,
    line_items: [{ price: priceId, quantity: 1 }],
    billing_address_collection: "required",
    customer_update: { address: "auto", name: "auto" },
    tax_id_collection: { enabled: true },
    ...(process.env.STRIPE_TAX_ENABLED === "true" ? { automatic_tax: { enabled: true } } : {}),
    success_url: `${origin}${nextPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${nextPath}?checkout=cancel`,
    metadata: { kind, workspace_id: membership.workspace_id },
    subscription_data: { metadata: { kind, workspace_id: membership.workspace_id } },
  }, { idempotencyKey: `duoshot-checkout-${membership.workspace_id}-${kind}-${crypto.randomUUID()}` });
  return NextResponse.json({ url: session.url });
}
