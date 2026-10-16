import { describe, expect, it } from "vitest";
import { duoSlotSummary, hasTransparentPixels, matchScreenshotSize, pngHasAlphaChannel } from "./screenshot-checker";

describe("screenshot sizes", () => {
  it.each([
    [1398, 2034, "duo-outer"], [2007, 2853, "duo-inner"],
    [1320, 2868, "iphone-69"], [1206, 2622, "iphone-63"],
  ])("matches %i × %i in both orientations", (width, height, slot) => {
    expect(matchScreenshotSize(width, height)).toMatchObject({ slot, orientation: "portrait", producedByDuoShot: true });
    expect(matchScreenshotSize(height, width)).toMatchObject({ slot, orientation: "landscape", producedByDuoShot: true });
  });

  it.each([
    [1179, 2556, "iphone-63", "portrait"], [2556, 1179, "iphone-63", "landscape"],
    [1290, 2796, "iphone-69", "portrait"], [2796, 1290, "iphone-69", "landscape"],
    [1260, 2736, "iphone-69", "portrait"], [2736, 1260, "iphone-69", "landscape"],
  ] as const)("accepts %i × %i as an Apple size not produced by DuoShot", (width, height, slot, orientation) => {
    expect(matchScreenshotSize(width, height)).toMatchObject({
      width, height, slot, orientation, producedByDuoShot: false,
    });
  });

  it.each([[0, 0], [-1398, 2034], [1398.5, 2034], [2034, 2034], [1399, 2034], [1398, 2033], [NaN, 2034], [Infinity, 2034]])(
    "rejects invalid or near-match dimensions %s × %s", (width, height) => {
      expect(matchScreenshotSize(width, height)).toBeNull();
    },
  );

  it("limits each Duo device size separately across orientations, excluding other sizes and errors", () => {
    const outer = matchScreenshotSize(1398, 2034);
    const outerLandscape = matchScreenshotSize(2034, 1398);
    const inner = matchScreenshotSize(2853, 2007);
    const others = [null, matchScreenshotSize(1206, 2622), matchScreenshotSize(2868, 1320), matchScreenshotSize(1179, 2556), matchScreenshotSize(1290, 2796)];
    expect(duoSlotSummary([])).toEqual({ counts: { "duo-outer": 0, "duo-inner": 0 }, overLimit: false });
    expect(duoSlotSummary([outer, ...others])).toEqual({ counts: { "duo-outer": 1, "duo-inner": 0 }, overLimit: false });
    const atLimit = [...Array(5).fill(outer), ...Array(5).fill(outerLandscape), ...Array(10).fill(inner), ...others];
    expect(duoSlotSummary(atLimit)).toEqual({ counts: { "duo-outer": 10, "duo-inner": 10 }, overLimit: false });
    expect(duoSlotSummary([...atLimit, outer])).toEqual({ counts: { "duo-outer": 11, "duo-inner": 10 }, overLimit: true });
    expect(duoSlotSummary([...atLimit, inner])).toEqual({ counts: { "duo-outer": 10, "duo-inner": 11 }, overLimit: true });
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
