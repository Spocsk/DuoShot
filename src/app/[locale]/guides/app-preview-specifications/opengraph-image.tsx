import { ogImage, ogImageMetadata } from "@/lib/og";
import { LOCALES, pageLocale, type LocaleParams } from "../../params";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("app-preview-guide", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("app-preview-guide", await pageLocale(params));
}
