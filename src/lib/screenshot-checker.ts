import { IPHONE_63_ALTERNATIVE, isDuoSlot, MAX_IMAGES, SIZE_SPECS, type SizeSpec } from "./specs";

export const SCREENSHOT_CHECKER_PATH = "/tools/iphone-duo-screenshot-checker";

export type ScreenshotSizeMatch = SizeSpec & { producedByDuoShot: boolean };

// Keep DuoShot output sizes distinct from other accepted Apple dimensions.
export const CHECKER_SPECS: ScreenshotSizeMatch[] = [
  ...SIZE_SPECS.map((spec) => ({ ...spec, producedByDuoShot: /^(outer|inner|63a|69a)-/.test(spec.id) })),
  ...(["portrait", "landscape"] as const).map((orientation) => ({
    id: `63b-${orientation}`, slot: "iphone-63" as const, label: 'iPhone 6.3"', inches: '6.3"',
    ...IPHONE_63_ALTERNATIVE[orientation], orientation, producedByDuoShot: false,
  })),
];

export function matchScreenshotSize(width: number, height: number): ScreenshotSizeMatch | null {
  return CHECKER_SPECS.find((spec) => spec.width === width && spec.height === height) ?? null;
}

export function hasTransparentPixels(rgba: Uint8ClampedArray): boolean {
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] < 255) return true;
  }
  return false;
}

/** Canvas cannot expose an entirely opaque PNG's encoded alpha channel. */
export function pngHasAlphaChannel(bytes: Uint8Array): boolean {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => bytes[index] === byte)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset);
    if (offset + length + 12 > bytes.length) return false;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === "IHDR" && length === 13 && (bytes[offset + 17] === 4 || bytes[offset + 17] === 6)) return true;
    if (type === "tRNS") return true;
    if (type === "IDAT" || type === "IEND") return false;
    offset += length + 12;
  }
  return false;
}

/** Count orientations together for each device size, with a separate limit for each. */
export function duoSlotSummary(matches: readonly (SizeSpec | null)[]) {
  const counts = { "duo-outer": 0, "duo-inner": 0 };
  for (const spec of matches) {
    if (spec && isDuoSlot(spec.slot)) counts[spec.slot] += 1;
  }
  return { counts, overLimit: Object.values(counts).some((count) => count > MAX_IMAGES) };
}
