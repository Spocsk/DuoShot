import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { data: owned, error: ownedError } = await supabase.from("workspace_members")
    .select("workspace_id").eq("user_id", user.id).eq("role", "owner");
  if (ownedError) return NextResponse.json({ error: "BILLING_LOOKUP_FAILED" }, { status: 500 });
  const stripe = getStripe();
  for (const member of owned ?? []) {
    const { data: workspace, error: workspaceError } = await supabase.from("workspaces")
      .select("stripe_subscription_id").eq("id", member.workspace_id).single();
    if (workspaceError) return NextResponse.json({ error: "BILLING_LOOKUP_FAILED" }, { status: 500 });
    if (workspace?.stripe_subscription_id) {
      if (!stripe) return NextResponse.json({ error: "BILLING_UNCONFIGURED" }, { status: 503 });
      try {
        const subscription = await stripe.subscriptions.retrieve(workspace.stripe_subscription_id);
        if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
          await stripe.subscriptions.cancel(workspace.stripe_subscription_id, { prorate: false });
        }
      } catch {
        return NextResponse.json({ error: "SUBSCRIPTION_CANCEL_FAILED" }, { status: 502 });
      }
    }
  }

  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    const admin = createAdminSupabase();
    if (!admin) return NextResponse.json({ error: "ANALYTICS_ERASURE_UNAVAILABLE" }, { status: 503 });
    const { error: queueError } = await admin.from("analytics_erasure_jobs")
      .upsert({ distinct_id: user.id, status: "pending" }, { onConflict: "distinct_id" });
    if (queueError) return NextResponse.json({ error: "ANALYTICS_ERASURE_UNAVAILABLE" }, { status: 503 });
  }

  const { error } = await supabase.rpc("erase_current_user");
  if (error) {
    if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
      const admin = createAdminSupabase();
      await admin?.from("analytics_erasure_jobs").delete()
        .eq("distinct_id", user.id).eq("status", "pending").is("tracking_id", null);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
