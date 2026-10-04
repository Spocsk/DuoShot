import { createAdminSupabase } from "@/lib/supabase/admin";
import { invalidLinkPage, isWaitlistToken, localeOf, readFormToken, unavailablePage, waitlistPage } from "../shared";

export const runtime = "nodejs";

/** Shows a removal button; opening the link alone changes nothing. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  let locale = localeOf(url.searchParams.get("lang"));
  if (!isWaitlistToken(token)) return invalidLinkPage(locale);
  const admin = createAdminSupabase();
  if (!admin) return unavailablePage(locale);
  const { data, error } = await admin.from("waitlist").select("locale").eq("token", token).maybeSingle();
  if (error) return unavailablePage(locale);
  if (!data) return removedPage(locale);
  locale = localeOf(data.locale);
  return waitlistPage({
    locale,
    title: locale === "en" ? "Remove your address" : "Retirer votre adresse",
    body: locale === "en"
      ? "Your address will be deleted from the DuoShot notification list."
      : "Votre adresse sera supprimée de la liste d’alerte DuoShot.",
    form: { action: "/api/waitlist/unsubscribe", token, label: locale === "en" ? "Remove my address" : "Retirer mon adresse" },
  });
}

/** Erasure, not a flag: the row (address, token, dates) is deleted. */
export async function POST(request: Request) {
  const token = await readFormToken(request);
  if (!token) return invalidLinkPage("fr");
  const admin = createAdminSupabase();
  if (!admin) return unavailablePage("fr");
  const { data, error } = await admin.from("waitlist").delete().eq("token", token).select("locale");
  if (error) return unavailablePage("fr");
  return removedPage(localeOf(data?.[0]?.locale));
}

function removedPage(locale: "fr" | "en") {
  return waitlistPage({
    locale,
    title: locale === "en" ? "Address removed" : "Adresse retirée",
    body: locale === "en"
      ? "Your address is no longer on the DuoShot notification list."
      : "Votre adresse ne figure plus sur la liste d’alerte DuoShot.",
  });
}
