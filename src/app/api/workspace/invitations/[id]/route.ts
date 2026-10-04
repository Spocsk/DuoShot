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
  const membership = lookup.membership;
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const revokedAt = new Date().toISOString();
  const { data } = await admin
    .from("workspace_invitations")
    .update({ revoked_at: revokedAt })
    .eq("id", id)
    .eq("workspace_id", membership.workspace_id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ id, revokedAt });
}
