import sharp from "sharp";
import { fingerprintFromPixels, type CloneFingerprint } from "./clone-score";

/** Structure hash and colour signals of a capture, computed exactly like the browser check. */
export async function hashFromBuffer(input: Buffer): Promise<CloneFingerprint> {
  const { data, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .removeAlpha()
    .toColourspace("srgb")
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return fingerprintFromPixels(data, info.channels, 9, 8);
}
