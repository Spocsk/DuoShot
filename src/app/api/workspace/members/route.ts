import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
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
  return NextResponse.json({ members: hydrated, limit: 3 });
}
