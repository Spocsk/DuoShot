import { NextResponse } from "next/server";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { CHECKOUT_CATALOG, type CheckoutKind } from "@/lib/plans";
import { checkoutAvailable } from "@/lib/billing-availability";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { createHash } from "node:crypto";

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

async function checkout(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { kind?: string; next?: string };
  if (!body.kind || !Object.hasOwn(CHECKOUT_CATALOG, body.kind)) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }
  if (!checkoutAvailable(user.id)) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
  const kind = body.kind as CheckoutKind;
  const priceId = priceIdFor(kind);
  const stripe = getStripe();
  const admin = createAdminSupabase();
  if (!stripe || !priceId || !admin) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });

  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { membership, workspace } = context;
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "BILLING_OWNER_REQUIRED" }, { status: 403 });
  }


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

  const { data: attempt, error: attemptError } = await admin.rpc("begin_checkout", {
    p_workspace_id: membership.workspace_id, p_kind: kind, p_return_path: safeNextPath(body.next),
  });
  if (attemptError || !attempt) return NextResponse.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 });
  if (attempt.session_id) {
    const existing = await stripe.checkout.sessions.retrieve(attempt.session_id);
    if (existing.status === "open" && existing.url) return NextResponse.json({ url: existing.url });
    if (existing.status === "complete") return NextResponse.json({ error: "ACTIVATION_PENDING" }, { status: 409 });
    // Explicitly expire the stored attempt; a following retry can choose another offer.
    await admin.from("checkout_attempts").update({ expires_at: new Date(0).toISOString() }).eq("workspace_id", membership.workspace_id).eq("attempt_id", attempt.attempt_id);
    return NextResponse.json({ error: "CHECKOUT_EXPIRED" }, { status: 409 });
  }
  const origin = getSiteUrl();

  const nextPath = safeNextPath(attempt.return_path);
  const selectedKind = attempt.kind as CheckoutKind;
  const selectedPrice = priceIdFor(selectedKind);
  if (!selectedPrice) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    integration_identifier: `duoshot-checkout-${createHash("sha256").update(attempt.attempt_id).digest("hex").slice(0, 8).replace(/[0-9a-f]/g, (char) => String.fromCharCode(97 + parseInt(char, 16)))}`,
    expires_at: Math.floor(Date.parse(attempt.expires_at) / 1000),
    customer: customerId,
    client_reference_id: membership.workspace_id,
    line_items: [{ price: selectedPrice, quantity: 1 }],
    billing_address_collection: "required",
    customer_update: { address: "auto", name: "auto" },
    tax_id_collection: { enabled: true },
    ...(process.env.STRIPE_TAX_ENABLED === "true" ? { automatic_tax: { enabled: true } } : {}),
    success_url: `${origin}${nextPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${nextPath}?checkout=cancel`,
    metadata: { kind: selectedKind, workspace_id: membership.workspace_id },
    subscription_data: { metadata: { kind: selectedKind, workspace_id: membership.workspace_id } },
  }, { idempotencyKey: `duoshot-checkout-${attempt.attempt_id}` });
  const { error: saveError } = await admin.from("checkout_attempts").update({ session_id: session.id }).eq("workspace_id", membership.workspace_id).eq("attempt_id", attempt.attempt_id);
  if (saveError) return NextResponse.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({ url: session.url });
}

export async function POST(request: Request) {
  try { return await checkout(request); }
  catch { return NextResponse.json({ error: "CHECKOUT_UNAVAILABLE" }, { status: 503 }); }
}
