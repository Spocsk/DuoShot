import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  DEMO_REVIEW_ID,
  HARBOR_SLIDES,
  harborSvg,
  EXAMPLE_ZIP_TREE,
  harborReviewJpeg,
  harborReviewPayload,
  isDemoReview,
} from "./harbor";
import { foldSafetyBand } from "../fold-detection";
import { FOLD_SAFE_PT, HARBOR_SCALE } from "./harbor-screens";

describe("harbor demo review", () => {
  it("exposes the Connect ZIP tree used on the landing", () => {
    expect(EXAMPLE_ZIP_TREE).toContain("exampleapp/duo-outer-portrait/01.png");
    expect(EXAMPLE_ZIP_TREE).toContain("exampleapp/duo-inner-portrait/01.png");
    expect(EXAMPLE_ZIP_TREE).toContain("exampleapp/README.txt");
  });

  it("builds a public Harbor payload without storage", () => {
    expect(isDemoReview(DEMO_REVIEW_ID)).toBe(true);
    const payload = harborReviewPayload();
    expect(payload.set_name).toBe("Harbor");
    expect(payload.demo).toBe(true);
    expect(payload.slides).toHaveLength(3);
    expect(payload.slides[0]?.outer).toContain(`/api/reviews/${DEMO_REVIEW_ID}/media`);
  });

  it("renders opaque review JPEGs", async () => {
    const outer = await harborReviewJpeg(0, "outer");
    const inner = await harborReviewJpeg(0, "inner");
    expect(outer).toBeTruthy();
    expect(inner).toBeTruthy();
    const outerMeta = await sharp(outer!).metadata();
    const innerMeta = await sharp(inner!).metadata();
    expect(outerMeta.format).toBe("jpeg");
    expect(outerMeta.hasAlpha).toBe(false);
    expect(outerMeta.width).toBe(1398);
    expect(outerMeta.height).toBe(2034);
    expect(innerMeta.format).toBe("jpeg");
    expect(innerMeta.hasAlpha).toBe(false);
    expect(innerMeta.width).toBe(2007);
    expect(innerMeta.height).toBe(2853);
    expect(await harborReviewJpeg(9, "outer")).toBeNull();
  });

  it("keeps every inner text and card out of the horizontal portrait fold", () => {
    const band = foldSafetyBand(2007, 2853, "portrait");
    expect(FOLD_SAFE_PT.top * HARBOR_SCALE).toBeLessThanOrEqual(band.top);
    expect(FOLD_SAFE_PT.bottom * HARBOR_SCALE).toBeGreaterThanOrEqual(band.top + band.height);
    for (const locale of ["en", "fr"] as const) {
      for (const index of HARBOR_SLIDES.keys()) {
        const { svg } = harborSvg(index, "inner", locale)!;
        const texts = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)" font-size="([\d.]+)"/g)];
        expect(texts.length).toBeGreaterThan(20);
        for (const [, y, size] of texts) {
          const baseline = Number(y);
          const top = baseline - Number(size);
          expect(baseline + Number(size) * 0.3 < FOLD_SAFE_PT.top || top > FOLD_SAFE_PT.bottom).toBe(true);
        }
        for (const [, y, h] of svg.matchAll(/<rect x="[\d.-]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" rx/g)) {
          const top = Number(y);
          expect(top + Number(h) < FOLD_SAFE_PT.top || top > FOLD_SAFE_PT.bottom).toBe(true);
        }
      }
    }
  });

  it("writes the demo in the page language", () => {
    const en = harborSvg(0, "inner", "en")!.svg;
    const fr = harborSvg(0, "inner", "fr")!.svg;
    expect(en).toContain("North Beach");
    expect(en).toContain("1.4 m");
    expect(fr).toContain("Plage Nord");
    expect(fr).toContain("1,4 m");
    expect(fr).not.toContain("1.4 m");
  });

  it("names each spot once on every screen", () => {
    for (const locale of ["en", "fr"] as const) {
      for (const index of HARBOR_SLIDES.keys()) {
        for (const side of ["outer", "inner"] as const) {
          const { svg } = harborSvg(index, side, locale)!;
          const names = [...svg.matchAll(/>([^<]+)<\/text>/g)].map(([, label]) => label!).filter((label) => /Reef|Récif/.test(label));
          expect(new Set(names).size).toBe(names.length);
        }
      }
    }
  });
});
