import { OUTER_PORTRAIT, INNER_PORTRAIT } from "@/lib/screenshot-copy";
import { ogImage, size, contentType } from "@/lib/og-image";

export { size, contentType };
export const alt = `DuoShot — Captures iPhone Duo pour App Store Connect : ${OUTER_PORTRAIT} externe, ${INNER_PORTRAIT} interne, portrait`;

export default function Image() {
  return ogImage("fr");
}
