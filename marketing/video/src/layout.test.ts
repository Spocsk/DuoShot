import { describe, expect, it } from "vitest";
import v2 from "../scripts/v2-real.json";
import { sizes } from "./assets";
import { captureScale, contentWidth, dimensionLabelProgress, dimensionTop, layout, outerToInner, outerToInnerDimensions, pairScale, reframeDimensions, reframeState, sceneOpacity, stageHeight, stageTop, zipPages } from "./layout";
import { fitText, textPage } from "./text-layout";

describe("capture geometry and timing", () => {
  it("maximizes the common scale inside the safe area below the heading", () => {
    expect(captureScale).toBeCloseTo(0.3414, 4);
    expect(sizes.inner.height * captureScale).toBe(stageHeight);
    for (const size of Object.values(sizes)) {
      expect(size.width * captureScale).toBeLessThanOrEqual(contentWidth);
      expect(size.height * captureScale).toBeLessThanOrEqual(stageHeight);
    }
    expect(stageTop).toBeGreaterThanOrEqual(layout.safe.top + layout.headingHeight);
    expect(dimensionTop + layout.dimensionHeight).toBe(layout.height - layout.safe.bottom);
  });
  it("fits mixed sizes side by side using a single scale", () => {
    const scale = pairScale(["classic", "inner"], stageHeight, true);
    for (const kind of ["classic", "inner"] as const) {
      expect(sizes[kind].width * scale).toBeLessThanOrEqual((contentWidth - layout.pairGap) / 2);
      expect(sizes[kind].height * scale).toBeLessThanOrEqual(stageHeight);
    }
  });
  it("uses all available width for the side-by-side outer and inner pair", () => {
    const scale = pairScale(["outer", "inner"]);
    expect((sizes.outer.width + sizes.inner.width) * scale + layout.pairGap).toBeCloseTo(contentWidth);
    expect(sizes.inner.height * scale).toBeLessThanOrEqual(stageHeight);
  });
  it.each([15, 30, 120, 300])("finishes outer-to-inner in at most 0.8 s (%s frames)", (duration) => {
    expect(outerToInner(0, 30, duration)).toBe(0);
    expect(outerToInner(Math.min(24, duration - 1), 30, duration)).toBe(1);
    expect(outerToInner(duration - 1, 30, duration)).toBe(1);
    expect(outerToInner(5, 30, duration)).toBeGreaterThan(0);
  });
  it("holds the classic, then crops, then reveals outer, then inner", () => {
    expect(reframeState(0, 151)).toEqual({ crop: 0, classic: 1, outer: 0, inner: 0 });
    const crop = reframeState(40, 151);
    expect(crop.crop).toBeGreaterThan(0); expect(crop.crop).toBeLessThan(1);
    expect(crop.classic).toBe(1); expect(crop.outer).toBe(0);
    expect(reframeState(80, 151)).toEqual({ crop: 1, classic: 0, outer: 1, inner: 0 });
    expect(reframeState(150, 151)).toEqual({ crop: 1, classic: 0, outer: 0, inner: 1 });
    for (let frame = 0; frame < 151; frame++) {
      const { classic, outer, inner } = reframeState(frame, 151);
      expect(classic + outer + inner).toBeCloseTo(1);
    }
  });
  it("shows the opening title on frame zero, including a 0.5 s title", () => {
    for (const duration of [15, 90]) {
      expect(sceneOpacity(0, duration, true)).toBe(1);
      expect(sceneOpacity(duration - 1, duration, true)).toBeGreaterThan(0);
    }
  });
});

describe("dimension label timing", () => {
  it.each([[18, 60], [0, 24], [2, 4.8], [0, 1]])("centers a fade of at most six frames inside [%s, %s]", (start, end) => {
    const midpoint = (start + end) / 2;
    const halfFade = Math.min(6, end - start) / 2;
    expect(dimensionLabelProgress(start - 1, start, end)).toBe(0);
    expect(dimensionLabelProgress(midpoint - halfFade, start, end)).toBeCloseTo(0);
    expect(dimensionLabelProgress(midpoint, start, end)).toBeCloseTo(0.5);
    expect(dimensionLabelProgress(midpoint + halfFade, start, end)).toBeCloseTo(1);
    expect(dimensionLabelProgress(end, start, end)).toBe(1);
    expect(dimensionLabelProgress(end + 1, start, end)).toBe(1);
  });

  it.each([15, 30, 150, 151, 300])("changes both reframe labels during their crops (%s frames)", (duration) => {
    const last = duration - 1;
    for (const [start, end, from, to] of [
      [0.12 * last, 0.40 * last, "classic", "outer"],
      [0.62 * last, 0.82 * last, "outer", "inner"],
    ] as const) {
      const midpoint = (start + end) / 2;
      const halfFade = Math.min(6, end - start) / 2;
      expect(reframeDimensions(start, duration)[from]).toBeCloseTo(1);
      expect(reframeDimensions(midpoint, duration)[from]).toBeCloseTo(0.5);
      expect(reframeDimensions(midpoint, duration)[to]).toBeCloseTo(0.5);
      expect(reframeDimensions(midpoint - halfFade, duration)[to]).toBeCloseTo(0);
      expect(reframeDimensions(midpoint + halfFade, duration)[to]).toBeCloseTo(1);
      expect(reframeDimensions(end, duration)[to]).toBeCloseTo(1);
    }
    for (let frame = 0; frame < duration; frame++) {
      const weights = Object.values(reframeDimensions(frame, duration));
      expect(weights.every((weight) => weight >= 0 && weight <= 1)).toBe(true);
      expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
    }
  });

  it.each([15, 30, 120, 300])("changes outer-to-inner labels halfway through the morph (%s frames)", (duration) => {
    const end = Math.min(24, Math.floor((duration - 1) * 0.75));
    expect(outerToInner(end / 2, 30, duration)).toBeCloseTo(0.5);
    expect(outerToInnerDimensions(0, 30, duration)).toEqual({ outer: 1, inner: 0 });
    expect(outerToInnerDimensions(end / 2 - 3, 30, duration)).toEqual({ outer: 1, inner: 0 });
    expect(outerToInnerDimensions(end / 2, 30, duration)).toEqual({ outer: 0.5, inner: 0.5 });
    expect(outerToInnerDimensions(end / 2 + 3, 30, duration)).toEqual({ outer: 0, inner: 1 });
    expect(outerToInnerDimensions(end, 30, duration)).toEqual({ outer: 0, inner: 1 });
  });
});

describe("ZIP text and local pagination", () => {
  // Plex Mono has a constant glyph advance of 0.6 em.
  const measure = (value: string, size: number) => Array.from(value).length * size * 0.6;
  it("keeps all four example files and their metadata on one page", () => {
    expect(zipPages(4, 120)).toEqual([{ from: 0, durationInFrames: 120, start: 0, end: 4 }]);
    const scene = v2.scenes.find((scene) => scene.type === "zip")!;
    for (const file of scene.files!) {
      expect(fitText(file.name, contentWidth - 52, 72, 24, 48, measure).pages).toHaveLength(1);
      expect(fitText(`${file.dims} · ${file.format.toUpperCase()}`, contentWidth - 52, 60, 24, 44, measure).pages).toHaveLength(1);
    }
  });
  it("shrinks a longer filename before paginating", () => {
    const fitted = fitText("my-long-filename-for-an-exported-outer-capture.png", contentWidth - 52, 72, 24, 48, measure);
    expect(fitted.size).toBeLessThan(48);
    expect(fitted.pages).toHaveLength(1);
  });
  it("uses contiguous local page durations, including odd frame counts", () => {
    expect(zipPages(8, 121)).toEqual([{ from: 0, durationInFrames: 60, start: 0, end: 4 }, { from: 60, durationInFrames: 61, start: 4, end: 8 }]);
    for (const page of zipPages(8, 121)) {
      expect(textPage(0, page.durationInFrames, 2)).toBe(0);
      expect(textPage(page.durationInFrames - 1, page.durationInFrames, 2)).toBe(1);
    }
  });
});
