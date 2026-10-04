import { createAdminSupabase } from "@/lib/supabase/admin";
import { invalidLinkPage, isWaitlistToken, localeOf, readFormToken, unavailablePage, waitlistPage } from "../shared";

export const runtime = "nodejs";

/** Shows a confirmation button; opening the link alone changes nothing. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  let locale = localeOf(url.searchParams.get("lang"));
  if (!isWaitlistToken(token)) return invalidLinkPage(locale);
  const admin = createAdminSupabase();
  if (!admin) return unavailablePage(locale);
  const { data, error } = await admin.from("waitlist").select("locale, confirmed_at").eq("token", token).maybeSingle();
  if (error) return unavailablePage(locale);
  if (!data) return invalidLinkPage(locale);
  locale = localeOf(data.locale);
  if (data.confirmed_at) return confirmedPage(locale);
  return waitlistPage({
    locale,
    title: locale === "en" ? "Confirm your address" : "Confirmez votre adresse",
    body: locale === "en"
      ? "One click to receive the DuoShot notice. You can remove your address at any time."
      : "Un clic pour recevoir l’alerte DuoShot. Vous pourrez retirer votre adresse à tout moment.",
    form: { action: "/api/waitlist/confirm", token, label: locale === "en" ? "Confirm" : "Confirmer" },
  });
}

export async function POST(request: Request) {
  const token = await readFormToken(request);
  if (!token) return invalidLinkPage("fr");
  const admin = createAdminSupabase();
  if (!admin) return unavailablePage("fr");
  const { data: row, error } = await admin.from("waitlist").select("id, locale, confirmed_at").eq("token", token).maybeSingle();
  if (error) return unavailablePage("fr");
  if (!row) return invalidLinkPage("fr");
  const locale = localeOf(row.locale);
  if (!row.confirmed_at) {
    const { error: updateError } = await admin.from("waitlist").update({ confirmed_at: new Date().toISOString() })
      .eq("id", row.id).is("confirmed_at", null);
    if (updateError) return unavailablePage(locale);
  }
  return confirmedPage(locale);
}

function confirmedPage(locale: "fr" | "en") {
  return waitlistPage({
    locale,
    title: locale === "en" ? "You’re on the list" : "Inscription confirmée",
    body: locale === "en"
      ? "We will send you one e-mail when it happens. Each e-mail includes a link to remove your address."
      : "Nous vous enverrons un e-mail le moment venu. Chaque e-mail contient un lien pour retirer votre adresse.",
  });
}
