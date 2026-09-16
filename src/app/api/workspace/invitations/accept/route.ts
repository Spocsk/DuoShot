import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const body = (await request.json()) as { token?: string };
  if (!body.token) return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  const tokenHash = createHash("sha256").update(body.token).digest("hex");
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const { data: invitation } = await admin
    .from("workspace_invitations")
    .select("id, workspace_id, email, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!invitation || invitation.revoked_at || invitation.accepted_at || new Date(invitation.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "INVITE_EXPIRED" }, { status: 410 });
  }
  if (!user.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: "EMAIL_MISMATCH" }, { status: 403 });
  }
  const { error: memberError } = await admin.from("workspace_members").upsert(
    { workspace_id: invitation.workspace_id, user_id: user.id, role: invitation.role, active: false },
    { onConflict: "workspace_id,user_id" },
  );
  if (memberError) return NextResponse.json({ error: "SEAT_LIMIT" }, { status: 409 });
  await admin.from("workspace_members").update({ active: false }).eq("user_id", user.id);
  await admin
    .from("workspace_members")
    .update({ active: true })
    .eq("user_id", user.id)
    .eq("workspace_id", invitation.workspace_id);
  await admin.from("workspace_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  return NextResponse.json({ workspaceId: invitation.workspace_id, accepted: true });
}
