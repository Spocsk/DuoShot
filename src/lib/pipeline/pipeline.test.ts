import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  canUse69,
  DEFAULT_RENDER_OPTIONS,
  SIZE_SPECS,
  targetsFor,
  type SizeSpec,
} from "../specs";
import { renderScreenshot } from "./process";
import { checkSourceCount } from "./validate";
import { zipEntryPath } from "./zip";

async function rgbaFixture(): Promise<Buffer> {
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

describe("pipeline", () => {
  it("renders exact pixels, flattens alpha, RGB PNG", async () => {
    const input = await rgbaFixture();
    const spec = SIZE_SPECS.find((item) => item.id === "outer-p") as SizeSpec;
    const output = await renderScreenshot(input, spec, {
      ...DEFAULT_RENDER_OPTIONS,
      format: "png",
      fit: "contain",
      background: "solid",
    });
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(1398);
    expect(meta.height).toBe(2034);
    expect(meta.hasAlpha).toBe(false);
    expect(meta.channels).toBe(3);
    expect(meta.format).toBe("png");
  });

  it("renders landscape inner dimensions", async () => {
    const input = await rgbaFixture();
    const spec = SIZE_SPECS.find((item) => item.id === "inner-l") as SizeSpec;
    const output = await renderScreenshot(input, spec, {
      ...DEFAULT_RENDER_OPTIONS,
      orientation: "landscape",
      fit: "cover",
    });
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(2853);
    expect(meta.height).toBe(2007);
    expect(meta.hasAlpha).toBe(false);
  });

  it("gates 6.9-inch sizes to Indie/Studio", () => {
    expect(canUse69("free")).toBe(false);
    expect(canUse69("indie")).toBe(true);
    expect(() =>
      targetsFor({ orientation: "portrait", include69: true, plan: "free" }),
    ).toThrow("IPHONE_69_GATED");
    const indie = targetsFor({
      orientation: "portrait",
      include69: true,
      plan: "indie",
    });
    expect(indie.some((spec) => spec.slot === "iphone-69")).toBe(true);
    const free = targetsFor({
      orientation: "portrait",
      include69: false,
      plan: "free",
    });
    expect(free.every((spec) => spec.slot !== "iphone-69")).toBe(true);
  });

  it("warns under 3 images and blocks over 10", () => {
    expect(checkSourceCount(2).warning).toBe("TOO_FEW");
    expect(() => checkSourceCount(11)).toThrow("TOO_MANY_IMAGES");
    expect(checkSourceCount(3).warning).toBeUndefined();
  });

  it("uses studio client-slug prefix and 6.9 subfolders", () => {
    const spec = SIZE_SPECS.find((item) => item.id === "69a-p") as SizeSpec;
    expect(
      zipEntryPath({
        appName: "Mon App",
        clientSlug: "acme-studio",
        spec,
        index: 0,
        format: "png",
      }),
    ).toBe("acme-studio/mon-app/iphone-69-portrait/1320x2868/01.png");
  });
});
