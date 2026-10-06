import { ogImage, ogImageMetadata } from "@/lib/og";
import { LOCALES, pageLocale, type LocaleParams } from "../params";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("cookies", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("cookies", await pageLocale(params));
}
