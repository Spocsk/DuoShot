import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isWaitlistTopic, localeOf, normalizeEmail, type WaitlistTopic } from "./shared";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2048;
/** A pending address gets at most one confirmation e-mail per window. */
export const RESEND_COOLDOWN_MS = 10 * 60_000;

function confirmationEmail(locale: "fr" | "en", topic: WaitlistTopic, confirmUrl: string, unsubscribeUrl: string) {
  if (locale === "en") {
    const reason = topic === "apple_duo_open"
      ? "You asked DuoShot to let you know when Apple opens iPhone Duo screenshot uploads in App Store Connect."
      : "You asked DuoShot to let you know about its launch.";
    return {
      subject: "Confirm your DuoShot notification",
      text: `${reason}\n\nConfirm your address: ${confirmUrl}\n\nIf you did not ask for this, ignore this message: without confirmation you will not receive anything else.\n\nRemove your address at any time: ${unsubscribeUrl}`,
    };
  }
  const reason = topic === "apple_duo_open"
    ? "Vous avez demandé à DuoShot de vous prévenir quand Apple ouvrira le dépôt des captures iPhone Duo dans App Store Connect."
    : "Vous avez demandé à DuoShot de vous prévenir de son lancement.";
  return {
    subject: "Confirmez votre alerte DuoShot",
    text: `${reason}\n\nConfirmez votre adresse : ${confirmUrl}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message : sans confirmation, vous ne recevrez rien d’autre.\n\nRetirez votre adresse à tout moment : ${unsubscribeUrl}`,
  };
}

/**
 * Double opt-in sign-up. The response is identical for new, pending and confirmed
 * addresses, and never contains the token, so it cannot confirm an address by itself.
 */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 413 });
  let body: Record<string, unknown> = {};
  try { body = (JSON.parse(raw || "{}") ?? {}) as Record<string, unknown>; } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 }); }

  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  const topic = body.topic ?? "apple_duo_open";
  if (!isWaitlistTopic(topic)) return NextResponse.json({ error: "INVALID_TOPIC" }, { status: 400 });
  const locale = localeOf(body.locale);
  const accepted = NextResponse.json({ ok: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  // Hidden field that people never fill; bots that do get the same answer and nothing stored.
  if (typeof body.company === "string" && body.company.length > 0) return accepted;

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "WAITLIST_UNAVAILABLE" }, { status: 503 });
  const { data: existing, error: lookupError } = await admin.from("waitlist")
    .select("id, token, confirmed_at").eq("email", email).eq("topic", topic).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "WAITLIST_UNAVAILABLE" }, { status: 503 });
  if (existing?.confirmed_at) return accepted;

  let token = existing?.token as string | undefined;
  if (existing) {
    // Claim the resend atomically; within the cooldown nothing is sent, same answer.
    const cutoff = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
    const { data: claimed, error } = await admin.from("waitlist").update({ last_sent_at: new Date().toISOString() })
      .eq("id", existing.id).is("confirmed_at", null).lt("last_sent_at", cutoff).select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "WAITLIST_UNAVAILABLE" }, { status: 503 });
    if (!claimed) return accepted;
  }
  if (!token) {
    token = randomBytes(32).toString("base64url");
    const { error } = await admin.from("waitlist").insert({ email, topic, locale, token });
    // A concurrent sign-up for the same address already sent its own confirmation.
    if (error?.code === "23505") return accepted;
    if (error) return NextResponse.json({ error: "WAITLIST_UNAVAILABLE" }, { status: 503 });
  }

  const origin = getSiteUrl();
  const query = `token=${encodeURIComponent(token)}&lang=${locale}`;
  const message = confirmationEmail(locale, topic, `${origin}/api/waitlist/confirm?${query}`, `${origin}/api/waitlist/unsubscribe?${query}`);
  try {
    await sendTransactionalEmail({ to: email, ...message });
  } catch {
    return NextResponse.json({ error: "EMAIL_FAILED" }, { status: 503 });
  }
  return accepted;
}
