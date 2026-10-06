import { ogImage, ogImageMetadata } from "@/lib/og";
import { LOCALES, pageLocale, type LocaleParams } from "../params";

// Account pages are not indexed, but their links still get shared: they show the home card.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("home", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("home", await pageLocale(params));
}
