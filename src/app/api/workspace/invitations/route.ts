import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function ownerContext() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 }) };
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "owner") {
    return { error: NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 }) };
  }
  return { user, membership };
}

export async function GET() {
  const context = await ownerContext();
  if (context.error) return context.error;
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const { data } = await admin
    .from("workspace_invitations")
    .select("id, email, role, created_at, expires_at, accepted_at, revoked_at")
    .eq("workspace_id", context.membership.workspace_id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: Request) {
  const context = await ownerContext();
  if (context.error) return context.error;
  const body = (await request.json()) as { email?: string; locale?: "fr" | "en" };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const { data: workspace } = await admin
    .from("workspaces")
    .select("name, plan")
    .eq("id", context.membership.workspace_id)
    .single();
  if (workspace?.plan !== "studio") return NextResponse.json({ error: "STUDIO_REQUIRED" }, { status: 403 });
  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    admin.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", context.membership.workspace_id),
    admin
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", context.membership.workspace_id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  if ((memberCount ?? 0) + (inviteCount ?? 0) >= 3) {
    return NextResponse.json({ error: "SEAT_LIMIT" }, { status: 409 });
  }
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("workspace_invitations")
    .insert({
      workspace_id: context.membership.workspace_id,
      email,
      role: "member",
      token_hash: tokenHash,
      invited_by: context.user.id,
      expires_at: expiresAt,
    })
    .select("id, email, role, created_at, expires_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "INVITE_FAILED" }, { status: 500 });
  const origin = new URL(request.url).origin;
  const path = `${body.locale === "en" ? "/en" : ""}/invite/${token}`;
  await sendTransactionalEmail({
    to: email,
    subject: body.locale === "en" ? `Join ${workspace.name} on DuoShot` : `Rejoignez ${workspace.name} sur DuoShot`,
    text:
      body.locale === "en"
        ? `You have been invited to a DuoShot Studio workspace. Accept within 7 days: ${origin}${path}`
        : `Vous êtes invité·e dans un espace DuoShot Studio. Acceptez sous 7 jours : ${origin}${path}`,
  });
  return NextResponse.json({ invitation: data, acceptPath: path }, { status: 201 });
}
