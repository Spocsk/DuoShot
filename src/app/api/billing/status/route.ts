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
      launchExpiresAt: null,
    });
  }
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan, free_exports_used, launch_offer_until, subscription_status")
    .eq("id", membership.workspace_id)
    .maybeSingle();
  const entitlements = await resolveEntitlements({
    email: user.email,
    workspaceId: membership.workspace_id,
    freeExportsUsed: workspace?.free_exports_used ?? 0,
    workspacePlan: workspace?.plan,
    launchOfferUntil: workspace?.launch_offer_until,
    subscriptionStatus: workspace?.subscription_status,
  });
  return NextResponse.json(entitlements);
}
