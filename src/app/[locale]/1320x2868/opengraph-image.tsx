import { ogImage, ogImageMetadata } from "@/lib/og";
import { LOCALES, pageLocale, type LocaleParams } from "../params";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("iphone-69", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("iphone-69", await pageLocale(params));
}
