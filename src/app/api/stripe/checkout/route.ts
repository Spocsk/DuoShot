import { NextResponse } from "next/server";
import { CHECKOUT_CATALOG, type CheckoutKind } from "@/lib/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { kind } = (await request.json()) as { kind?: CheckoutKind };
  if (!kind || !(kind in CHECKOUT_CATALOG)) {
    return NextResponse.json({ error: "UNKNOWN_OFFER" }, { status: 400 });
  }
  const catalog = CHECKOUT_CATALOG[kind];

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });
  }

  const origin = getSiteUrl();
  if (!isStripeConfigured()) {
    return NextResponse.json({
      url: `${origin}/account?checkout=mock&kind=${kind}`,
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "STRIPE_UNAVAILABLE" }, { status: 503 });
  }

  const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
  const customer =
    customers.data[0] ??
    (await stripe.customers.create({
      email: user.email || undefined,
      metadata: { workspace_id: membership.workspace_id, user_id: user.id },
    }));

  const session = await stripe.checkout.sessions.create({
    mode: catalog.mode,
    customer: customer.id,
    client_reference_id: membership.workspace_id,
    success_url: `${origin}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/account?checkout=cancel`,
    metadata: { kind, workspace_id: membership.workspace_id, user_id: user.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          product_data: { name: catalog.name },
          unit_amount: catalog.amountCents,
          ...(catalog.mode === "subscription" ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}
