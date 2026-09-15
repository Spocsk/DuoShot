import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { DEFAULT_RENDER_OPTIONS, duoSpec } from "../specs";
import { composeZipImages, reviewPairJpegs } from "./compose";

async function sourcePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 80,
      height: 120,
      channels: 4,
      background: { r: 220, g: 40, b: 90, alpha: 0.4 },
    },
  })
    .png()
    .toBuffer();
}

describe("compose", () => {
  it("renders portrait outer at 1398×2034", async () => {
    const input = await sourcePng();
    const { images } = await composeZipImages({
      outerBuffers: [input],
      innerBuffers: [input],
      options: { ...DEFAULT_RENDER_OPTIONS, orientation: "portrait", format: "png" },
      include69: false,
      plan: "free",
    });
    const outer = images.find((item) => item.spec.slot === "duo-outer");
    expect(outer).toBeTruthy();
    const meta = await sharp(outer!.buffer).metadata();
    expect(meta.width).toBe(1398);
    expect(meta.height).toBe(2034);
    expect(outer!.spec).toEqual(duoSpec("duo-outer", "portrait"));
  });

  it("renders landscape outer at 2034×1398", async () => {
    const input = await sourcePng();
    const { images } = await composeZipImages({
      outerBuffers: [input],
      innerBuffers: [input],
      options: { ...DEFAULT_RENDER_OPTIONS, orientation: "landscape", format: "png" },
      include69: false,
      plan: "free",
    });
    const outer = images.find((item) => item.spec.slot === "duo-outer");
    const meta = await sharp(outer!.buffer).metadata();
    expect(meta.width).toBe(2034);
    expect(meta.height).toBe(1398);
  });

  it("composes review JPEGs at Connect pixels, not 720", async () => {
    const input = await sourcePng();
    const pair = await reviewPairJpegs({
      outer: input,
      inner: input,
      options: { ...DEFAULT_RENDER_OPTIONS, orientation: "portrait" },
      plan: "studio",
    });
    const outerMeta = await sharp(pair.outer).metadata();
    const innerMeta = await sharp(pair.inner).metadata();
    expect(outerMeta.format).toBe("jpeg");
    expect(outerMeta.width).toBe(1398);
    expect(outerMeta.height).toBe(2034);
    expect(innerMeta.width).toBe(2007);
    expect(innerMeta.height).toBe(2853);
  });
});
