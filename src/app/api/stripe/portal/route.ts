import { NextResponse } from "next/server";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { billingEnvironmentMatches } from "@/lib/billing-environment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { membership, workspace } = context;
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "BILLING_OWNER_REQUIRED" }, { status: 403 });
  }
  if (!workspace?.stripe_customer_id) {
    return NextResponse.json({ error: "NO_BILLING_CUSTOMER" }, { status: 404 });
  }
  const stripe = getStripe();
  if (!stripe || !billingEnvironmentMatches()) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const path = body.locale === "en" ? "/en/account" : "/account";
  const portal = await stripe.billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${getSiteUrl()}${path}`,
  });
  return NextResponse.json({ url: portal.url });
}
