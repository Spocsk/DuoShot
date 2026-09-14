import { ogImage, size, contentType } from "@/lib/og-image";

export { size, contentType };
export const alt = "DuoShot — App Store Connect ZIP for iPhone Duo, no alpha, no 2.3.3 clone";

export default function Image() {
  return ogImage("en");
}
