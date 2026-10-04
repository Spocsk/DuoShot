import type { Locale } from "@/lib/specs";
import type { WaitlistTopic } from "@/components/waitlist-form";

export type { WaitlistTopic };
// Mirrors the migration's check constraint and the form's exported topic type.
export const WAITLIST_TOPICS: readonly WaitlistTopic[] = ["apple_duo_open", "launch"];

export const MAX_EMAIL_LENGTH = 254;

export function isWaitlistTopic(value: unknown): value is WaitlistTopic {
  return typeof value === "string" && (WAITLIST_TOPICS as readonly string[]).includes(value);
}

/** Lowercased address, or null when it is not a plausible single e-mail address. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > MAX_EMAIL_LENGTH) return null;
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email) ? email : null;
}

/** Tokens are 32 random bytes in base64url (43 characters). */
export function isWaitlistToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Minimal standalone page for links opened from e-mail. Actions are POST forms so
 * that link scanners prefetching the URL never confirm or unsubscribe an address.
 */
export function waitlistPage(options: {
  locale: Locale;
  title: string;
  body: string;
  status?: number;
  form?: { action: string; token: string; label: string };
}): Response {
  const { locale, title, body, form } = options;
  const home = locale === "en" ? "/en" : "/";
  const formHtml = form
    ? `<form method="post" action="${escapeHtml(form.action)}"><input type="hidden" name="token" value="${escapeHtml(form.token)}"><button type="submit">${escapeHtml(form.label)}</button></form>`
    : "";
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · DuoShot</title>
<style>
:root{color-scheme:light;--bg:#f4f1ea;--ink:#141414;--muted:#6b645c}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:34rem;margin:0 auto;padding:4rem 1rem}
h1{font-size:1.75rem;line-height:1.2;margin:0 0 1rem}
p{color:var(--muted);margin:0 0 1.5rem}
button{min-height:2.75rem;padding:0 1.25rem;border:0;border-radius:999px;background:var(--ink);color:var(--bg);font:inherit;cursor:pointer}
a{color:var(--ink)}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(body)}</p>
${formHtml}
<p><a href="${home}">${locale === "en" ? "Back to DuoShot" : "Retour à DuoShot"}</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: options.status ?? 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
    },
  });
}

export function invalidLinkPage(locale: Locale): Response {
  return waitlistPage({
    locale,
    status: 404,
    title: locale === "en" ? "Link no longer valid" : "Lien plus valable",
    body: locale === "en"
      ? "This link is invalid or the address has already been removed from the list."
      : "Ce lien n’est pas valide ou l’adresse a déjà été retirée de la liste.",
  });
}

export function unavailablePage(locale: Locale): Response {
  return waitlistPage({
    locale,
    status: 503,
    title: locale === "en" ? "Temporarily unavailable" : "Momentanément indisponible",
    body: locale === "en" ? "Please try again in a moment." : "Réessayez dans un instant.",
  });
}

export async function readFormToken(request: Request): Promise<string | null> {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  return isWaitlistToken(token) ? token : null;
}

export function localeOf(value: unknown): Locale {
  return value === "en" ? "en" : "fr";
}
