import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { readActiveMembership } from "@/lib/active-membership";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const lookup = await readActiveMembership(supabase, user.id);
  if (lookup.failed) return NextResponse.json({ error: "WORKSPACE_UNAVAILABLE" }, { status: 503 });
  const owner = lookup.membership;
  if (!owner || owner.role !== "owner") {
    return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const { data } = await admin
    .from("workspace_members")
    .delete()
    .eq("id", id)
    .eq("workspace_id", owner.workspace_id)
    .neq("role", "owner")
    .select("id, user_id, active")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  // Only a user who just lost their active workspace needs another one switched on;
  // otherwise their current active membership must stay as it is.
  if (!data.active) return NextResponse.json({ id, revoked: true });
  const { data: fallback } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", data.user_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (fallback) {
    const { error } = await admin.from("workspace_members").update({ active: true }).eq("id", fallback.id);
    // The removal itself succeeded; the user is left without an active workspace until they pick one.
    if (error) console.error("member_fallback_activation_failed", { membershipId: fallback.id });
  }
  return NextResponse.json({ id, revoked: true });
}
