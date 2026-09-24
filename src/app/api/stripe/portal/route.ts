import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members")
    .select("workspace_id, role").eq("user_id", user.id).eq("active", true).limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "BILLING_OWNER_REQUIRED" }, { status: 403 });
  }
  const { data: workspace } = await supabase.from("workspaces")
    .select("stripe_customer_id").eq("id", membership.workspace_id).single();
  if (!workspace?.stripe_customer_id) {
    return NextResponse.json({ error: "NO_BILLING_CUSTOMER" }, { status: 404 });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const path = body.locale === "en" ? "/en/account" : "/account";
  const portal = await stripe.billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${getSiteUrl()}${path}`,
  });
  return NextResponse.json({ url: portal.url });
}
