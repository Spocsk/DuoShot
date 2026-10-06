import { ogImage, ogImageMetadata } from "@/lib/og";
import { pageLocale, type LocaleParams } from "../params";

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("rejection", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("rejection", await pageLocale(params, "en"));
}
