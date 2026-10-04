import { ogImage } from "@/lib/og-image";
export { alt, size, contentType } from "../opengraph-image";

// Pages that set their own Open Graph fields need their own image file to keep a card.
export function generateStaticParams() {
  return [{ locale: "en" }];
}

export default function Image() {
  return ogImage("en");
}
