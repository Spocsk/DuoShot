import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveEntitlements } from "./billing";

/** Never turn a failed database lookup into a fresh free trial. */
export async function readWorkspaceBilling(supabase: SupabaseClient, userId: string) {
  const { data: membership, error: memberError } = await supabase.from("workspace_members")
    .select("workspace_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (memberError) return { ok: false as const, error: "BILLING_UNAVAILABLE", status: 503 };
  if (!membership) return { ok: false as const, error: "NO_WORKSPACE", status: 409 };
  const { data: workspace, error } = await supabase.from("workspaces")
    .select("id, name, client_slug, plan, manual_plan, free_exports_used, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_period_end, subscription_cancel_at_period_end")
    .eq("id", membership.workspace_id).maybeSingle();
  if (error || !workspace) return { ok: false as const, error: "BILLING_UNAVAILABLE", status: 503 };
  const entitlements = resolveEntitlements({
    freeExportsUsed: workspace.free_exports_used,
    workspacePlan: workspace.plan, manualPlan: workspace.manual_plan,
    customerId: workspace.stripe_customer_id, subscriptionId: workspace.stripe_subscription_id,
    subscriptionStatus: workspace.subscription_status, periodEnd: workspace.subscription_period_end,
    cancelAtPeriodEnd: workspace.subscription_cancel_at_period_end,
  });
  return { ok: true as const, membership, workspace, entitlements };
}
