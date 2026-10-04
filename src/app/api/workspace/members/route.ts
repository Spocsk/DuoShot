import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { readActiveMembership } from "@/lib/active-membership";
import { STUDIO_SEATS } from "@/lib/plans";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const lookup = await readActiveMembership(supabase, user.id);
  if (lookup.failed) return NextResponse.json({ error: "WORKSPACE_UNAVAILABLE" }, { status: 503 });
  const membership = lookup.membership;
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const { data: members } = await admin
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: true });
  const hydrated = await Promise.all(
    (members ?? []).map(async (member) => {
      const { data } = await admin.auth.admin.getUserById(member.user_id);
      return { ...member, email: data.user?.email ?? null };
    }),
  );
  return NextResponse.json({ members: hydrated, limit: STUDIO_SEATS });
}
