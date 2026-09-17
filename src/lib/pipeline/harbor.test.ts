import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  DEMO_REVIEW_ID,
  EXAMPLE_ZIP_TREE,
  harborReviewJpeg,
  harborReviewPayload,
  isDemoReview,
} from "./harbor";

describe("harbor demo review", () => {
  it("exposes the Connect ZIP tree used on the landing", () => {
    expect(EXAMPLE_ZIP_TREE).toContain("exampleapp/duo-outer-portrait/01.png");
    expect(EXAMPLE_ZIP_TREE).toContain("exampleapp/duo-inner-portrait/03.png");
    expect(EXAMPLE_ZIP_TREE).toContain("exampleapp/README.txt");
  });

  it("builds a public Harbor payload without storage", async () => {
    expect(isDemoReview(DEMO_REVIEW_ID)).toBe(true);
    const payload = await harborReviewPayload();
    expect(payload.set_name).toBe("Harbor");
    expect(payload.demo).toBe(true);
    expect(payload.slides).toHaveLength(3);
    expect(["ok", "review", "risk"]).toContain(payload.slides[0]?.clone);
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
});
