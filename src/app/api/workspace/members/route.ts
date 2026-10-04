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
  // Two queries in total, whatever the seat count: the rows, then every email through a
  // service-role SQL function (one Auth Admin call per member used to scale with the team).
  const [members, emails] = await Promise.all([
    admin
      .from("workspace_members")
      .select("id, user_id, role, created_at")
      .eq("workspace_id", membership.workspace_id)
      .order("created_at", { ascending: true }),
    admin.rpc("workspace_member_emails", { p_workspace: membership.workspace_id }),
  ]);
  if (members.error || emails.error) {
    console.error("workspace_members_unavailable", { members: Boolean(members.error), emails: Boolean(emails.error) });
    return NextResponse.json({ error: "MEMBERS_UNAVAILABLE" }, { status: 503 });
  }
  const emailById = new Map(
    (emails.data ?? []).map((row) => [row.user_id, row.email]),
  );
  const hydrated = (members.data ?? []).map((member) => ({ ...member, email: emailById.get(member.user_id) ?? null }));
  return NextResponse.json({ members: hydrated, limit: STUDIO_SEATS });
}
