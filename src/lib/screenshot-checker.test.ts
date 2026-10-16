import { describe, expect, it } from "vitest";
import { duoSlotSummary, hasTransparentPixels, matchScreenshotSize, pngHasAlphaChannel } from "./screenshot-checker";

describe("screenshot sizes", () => {
  it.each([
    [1398, 2034, "duo-outer"], [2007, 2853, "duo-inner"],
    [1320, 2868, "iphone-69"], [1206, 2622, "iphone-63"],
  ])("matches %i × %i in both orientations", (width, height, slot) => {
    expect(matchScreenshotSize(width, height)).toMatchObject({ slot, orientation: "portrait" });
    expect(matchScreenshotSize(height, width)).toMatchObject({ slot, orientation: "landscape" });
  });

  it.each([[0, 0], [-1398, 2034], [1398.5, 2034], [2034, 2034], [1399, 2034], [1398, 2033], [NaN, 2034], [Infinity, 2034]])(
    "rejects invalid or near-match dimensions %s × %s", (width, height) => {
      expect(matchScreenshotSize(width, height)).toBeNull();
    },
  );

  it("combines outer and inner images across orientations, excluding other sizes and errors", () => {
    const outer = matchScreenshotSize(1398, 2034);
    const inner = matchScreenshotSize(2853, 2007);
    const others = [null, matchScreenshotSize(1206, 2622), matchScreenshotSize(2868, 1320)];
    expect(duoSlotSummary([])).toEqual({ count: 0, overLimit: false });
    expect(duoSlotSummary([outer, ...others])).toEqual({ count: 1, overLimit: false });
    expect(duoSlotSummary([...Array(5).fill(outer), ...Array(5).fill(inner), ...others])).toEqual({ count: 10, overLimit: false });
    expect(duoSlotSummary([...Array(6).fill(outer), ...Array(5).fill(inner), ...others])).toEqual({ count: 11, overLimit: true });
  });
});

it("detects even one partially transparent pixel, including the last pixel", () => {
  expect(hasTransparentPixels(new Uint8ClampedArray([]))).toBe(false);
  expect(hasTransparentPixels(new Uint8ClampedArray([0, 0, 0, 255, 2, 3, 4, 255]))).toBe(false);
  for (const alpha of [0, 1, 254]) {
    expect(hasTransparentPixels(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, alpha]))).toBe(true);
  }
});

function pngHeader(colorType: number, transparency = false) {
  const bytes = new Uint8Array(33 + (transparency ? 14 : 0));
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8); // IHDR
  bytes[25] = colorType;
  if (transparency) bytes.set([0, 0, 0, 2, 116, 82, 78, 83], 33); // tRNS
  return bytes;
}

it("flags PNG alpha and transparency metadata even with opaque pixels", () => {
  for (const type of [4, 6]) expect(pngHasAlphaChannel(pngHeader(type))).toBe(true);
  for (const type of [0, 2, 3]) expect(pngHasAlphaChannel(pngHeader(type))).toBe(false);
  expect(pngHasAlphaChannel(pngHeader(3, true))).toBe(true);
  expect(pngHasAlphaChannel(new Uint8Array([255, 216, 255]))).toBe(false);
  expect(pngHasAlphaChannel(pngHeader(6).subarray(0, 27))).toBe(false);
  const oversizedChunk = pngHeader(2);
  oversizedChunk.set([255, 255, 255, 255], 8);
  expect(pngHasAlphaChannel(oversizedChunk)).toBe(false);
});
