import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  canUse69,
  DEFAULT_RENDER_OPTIONS,
  SIZE_SPECS,
  hingeBand,
  textOverlayLayout,
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

function countBrightPixels(
  data: Buffer,
  width: number,
  channels: number,
  area: { left: number; top: number; right: number; bottom: number },
): number {
  let count = 0;
  for (let y = area.top; y < area.bottom; y += 1) {
    for (let x = area.left; x < area.right; x += 1) {
      const offset = (y * width + x) * channels;
      if ((data[offset] ?? 0) > 180 && (data[offset + 1] ?? 0) > 180 && (data[offset + 2] ?? 0) > 180) {
        count += 1;
      }
    }
  }
  return count;
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

  it("renders landscape outer dimensions", async () => {
    const input = await rgbaFixture();
    const spec = SIZE_SPECS.find((item) => item.id === "outer-l") as SizeSpec;
    const output = await renderScreenshot(input, spec, {
      ...DEFAULT_RENDER_OPTIONS,
      orientation: "landscape",
      fit: "contain",
    });
    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(2034);
    expect(meta.height).toBe(1398);
    expect(meta.hasAlpha).toBe(false);
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

  it("keeps generated copy clear of the preview bezel safe area", async () => {
    const input = await rgbaFixture();
    const spec = SIZE_SPECS.find((item) => item.id === "outer-p") as SizeSpec;
    const safe = Math.round(Math.min(spec.width, spec.height) * 0.04);

    for (const titlePosition of ["top", "bottom"] as const) {
      const output = await renderScreenshot(input, spec, {
        ...DEFAULT_RENDER_OPTIONS,
        title: "Product title",
        subtitle: "Client approved",
        titlePosition,
      });
      const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
      const edgeBright =
        countBrightPixels(data, info.width, info.channels, { left: 0, top: 0, right: info.width, bottom: safe }) +
        countBrightPixels(data, info.width, info.channels, { left: 0, top: info.height - safe, right: info.width, bottom: info.height }) +
        countBrightPixels(data, info.width, info.channels, { left: 0, top: safe, right: safe, bottom: info.height - safe }) +
        countBrightPixels(data, info.width, info.channels, { left: info.width - safe, top: safe, right: info.width, bottom: info.height - safe });
      const contentBright = countBrightPixels(data, info.width, info.channels, {
        left: safe,
        top: safe,
        right: info.width - safe,
        bottom: info.height - safe,
      });

      expect(edgeBright).toBe(0);
      expect(contentBright).toBeGreaterThan(0);
    }
  });

  it("keeps generated inner portrait copy clear of the hinge", () => {
    const spec = SIZE_SPECS.find((item) => item.id === "inner-p") as SizeSpec;
    const layout = textOverlayLayout(spec, "bottom");
    const hinge = hingeBand(spec);
    expect(layout.x + layout.maxWidth / 2).toBeLessThan(hinge.x);
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

  it("prefixes Indie client folders without requiring Studio", () => {
    const spec = SIZE_SPECS.find((item) => item.id === "outer-p") as SizeSpec;
    expect(
      zipEntryPath({
        appName: "Weather",
        clientSlug: "north",
        spec,
        index: 1,
        format: "png",
      }),
    ).toBe("north/weather/duo-outer-portrait/02.png");
  });
});
