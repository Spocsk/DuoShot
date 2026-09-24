import { NextResponse } from "next/server";
import { resolveEntitlements } from "@/lib/billing";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({
      plan: "free",
      source: "none",
      remainingFreeExports: 2,
      canUse69: false,
    });
  }
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan, manual_plan, free_exports_used, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_period_end, subscription_cancel_at_period_end")
    .eq("id", membership.workspace_id)
    .maybeSingle();
  const entitlements = resolveEntitlements({
    freeExportsUsed: workspace?.free_exports_used ?? 0,
    workspacePlan: workspace?.plan,
    manualPlan: workspace?.manual_plan,
    customerId: workspace?.stripe_customer_id,
    subscriptionId: workspace?.stripe_subscription_id,
    subscriptionStatus: workspace?.subscription_status,
    periodEnd: workspace?.subscription_period_end,
    cancelAtPeriodEnd: workspace?.subscription_cancel_at_period_end,
  });
  return NextResponse.json(entitlements);
}
