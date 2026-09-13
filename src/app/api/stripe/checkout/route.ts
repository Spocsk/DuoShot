import { NextResponse } from "next/server";
import { CHECKOUT_CATALOG, PRO_CHECKOUT_KIND, type CheckoutKind } from "@/lib/plans";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/tool";
  if (value === "/tool" || value === "/en/tool") return value;
  return "/tool";
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = (await request.json()) as { kind?: CheckoutKind; next?: string };
  const kind = body.kind && body.kind in CHECKOUT_CATALOG ? body.kind : PRO_CHECKOUT_KIND;
  const catalog = CHECKOUT_CATALOG[kind];
  const nextPath = safeNextPath(body.next);

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
      url: `${origin}${nextPath}?checkout=mock&kind=${kind}`,
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
    success_url: `${origin}${nextPath}?checkout=success`,
    cancel_url: `${origin}${nextPath}?checkout=cancel`,
    metadata: { kind, workspace_id: membership.workspace_id, user_id: user.id },
    ...(catalog.mode === "subscription"
      ? {
          subscription_data: {
            metadata: { kind, workspace_id: membership.workspace_id, user_id: user.id },
          },
        }
      : {}),
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
