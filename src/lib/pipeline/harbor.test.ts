import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  DEMO_REVIEW_ID,
  HARBOR_SLIDES,
  harborInnerSvg,
  harborOuterSvg,
  harborSlides,
  EXAMPLE_ZIP_TREE,
  harborReviewJpeg,
  harborReviewPayload,
  isDemoReview,
} from "./harbor";

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

  it("writes the demo in French for the French tool", () => {
    expect(harborSlides("fr").map((slide) => slide.place)).toEqual(["Nord", "2,1 m", "Nord"]);
    expect(harborSlides("en")).toBe(HARBOR_SLIDES);
    const svg = harborInnerSvg(2007, 2853, harborSlides("en")[0]!);
    expect(svg).toContain("West reef");
    const outer = harborOuterSvg(1398, 2034, harborSlides("fr")[0]!);
    expect(outer).toContain("1,4 m");
    expect(outer).not.toContain("1.4 m");
  });
});
