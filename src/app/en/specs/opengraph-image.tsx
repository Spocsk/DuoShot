import { OUTER_PORTRAIT, INNER_PORTRAIT } from "@/lib/screenshot-copy";
import { ogImage, size, contentType } from "@/lib/og-image";

export { size, contentType };
export const alt = `DuoShot — iPhone Duo screenshots for App Store Connect: ${OUTER_PORTRAIT} outer, ${INNER_PORTRAIT} inner, portrait`;

export default function Image() {
  return ogImage("en");
}
