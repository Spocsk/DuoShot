import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: owner } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
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
    .select("id, user_id")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { data: fallback } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", data.user_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (fallback) await admin.from("workspace_members").update({ active: true }).eq("id", fallback.id);
  return NextResponse.json({ id, revoked: true });
}
