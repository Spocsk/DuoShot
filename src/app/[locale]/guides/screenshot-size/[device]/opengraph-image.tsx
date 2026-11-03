import { ogImage, ogImageMetadata } from "@/lib/og";
import { pageLocale, type LocaleParams } from "../../../params";

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  return ogImageMetadata("specs", params);
}

export default async function Image({ params }: LocaleParams) {
  return ogImage("specs", await pageLocale(params));
}
