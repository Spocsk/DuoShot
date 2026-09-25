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
  const { data: workspaceId, error } = await admin.rpc("accept_workspace_invitation", { p_token_hash: tokenHash, p_user_id: user.id });
  if (error) {
    const code = ["INVITE_EXPIRED", "EMAIL_MISMATCH", "SEAT_LIMIT", "STUDIO_REQUIRED"].find((code) => error.message.includes(code));
    return NextResponse.json({ error: code ?? "INVITE_FAILED" }, { status: code === "INVITE_EXPIRED" ? 410 : code === "EMAIL_MISMATCH" ? 403 : code ? 409 : 503 });
  }
  return NextResponse.json({ workspaceId, accepted: true });
}
