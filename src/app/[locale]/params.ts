import { notFound } from "next/navigation";
import type { Locale } from "@/lib/specs";

/*
 * One page tree serves both languages. French URLs stay unprefixed: next.config.ts rewrites
 * them to /fr/… internally and redirects any public /fr/… URL back to its unprefixed form.
 */

export const LOCALES = ["fr", "en"] as const satisfies readonly Locale[];

export type LocaleParams = { params: Promise<{ locale: string }> };

/** The page's locale; 404 for anything else, or for the other language of a localized slug. */
export async function pageLocale(params: LocaleParams["params"], only?: Locale): Promise<Locale> {
  const { locale } = await params;
  if ((locale !== "fr" && locale !== "en") || (only && locale !== only)) notFound();
  return locale;
}
