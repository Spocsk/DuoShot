import { OUTER_PORTRAIT, INNER_PORTRAIT } from "@/lib/screenshot-copy";
import { ogImage, size, contentType } from "@/lib/og-image";
import { LOCALES, pageLocale, type LocaleParams } from "./params";

export { size, contentType };
// `alt` is static per file, so it stays language-neutral for both locales.
export const alt = `DuoShot — iPhone Duo · App Store Connect · ${OUTER_PORTRAIT} / ${INNER_PORTRAIT} px`;

// Rendered once per locale at build time, like the per-language images it replaces.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function Image({ params }: LocaleParams) {
  return ogImage(await pageLocale(params));
}
