import { ogImage, ogImageMetadata } from "@/lib/og";
import { pageLocale, type LocaleParams } from "../params";

export function generateStaticParams() {
  return [{ locale: "fr" }];
}

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("why-not-ai", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("why-not-ai", await pageLocale(params, "fr"));
}
