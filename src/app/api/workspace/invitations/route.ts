import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { getSiteUrl } from "@/lib/site";
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
  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return { error: NextResponse.json({ error: context.error }, { status: context.status }) };
  const { membership, workspace, entitlements } = context;
  if (!membership || membership.role !== "owner") {
    return { error: NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 }) };
  }
  return { user, membership, workspace, entitlements };
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
  const workspace = context.workspace;
  if (context.entitlements.plan !== "studio") return NextResponse.json({ error: "STUDIO_REQUIRED" }, { status: 403 });
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await admin.rpc("create_workspace_invitation", {
    p_workspace_id: context.membership.workspace_id, p_user_id: context.user.id, p_email: email, p_token_hash: tokenHash,
  });
  if (error || !data) {
    const code = ["SEAT_LIMIT", "INVITE_EXISTS", "ALREADY_MEMBER", "STUDIO_REQUIRED"].find((code) => error?.message?.includes(code));
    return NextResponse.json({ error: code ?? "INVITE_FAILED" }, { status: code ? 409 : 503 });
  }
  const origin = getSiteUrl();
  const path = `${body.locale === "en" ? "/en" : ""}/invite/${token}`;
  const delivery = await sendTransactionalEmail({
    to: email,
    subject: body.locale === "en" ? `Join ${workspace.name} on DuoShot` : `Rejoignez ${workspace.name} sur DuoShot`,
    text:
      body.locale === "en"
        ? `You have been invited to a DuoShot Studio workspace. Accept within 7 days: ${origin}${path}`
        : `Vous êtes invité·e dans un espace DuoShot Studio. Acceptez sous 7 jours : ${origin}${path}`,
  }).catch(() => ({ sent: false, mocked: false }));
  return NextResponse.json({ invitation: data, acceptPath: path, emailSent: delivery.sent }, { status: 201 });
}
