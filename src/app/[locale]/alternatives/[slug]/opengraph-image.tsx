import { ogImage, ogImageMetadata } from "@/lib/og";
import { pageLocale, type LocaleParams } from "../../params";

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("competitor-comparison", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("competitor-comparison", await pageLocale(params));
}
