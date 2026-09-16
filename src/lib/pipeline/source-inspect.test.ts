import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { inspectSource } from "./source-inspect";

describe("inspectSource", () => {
  it("detects PNG with alpha", async () => {
    const png = await sharp({
      create: {
        width: 12,
        height: 8,
        channels: 4,
        background: { r: 20, g: 40, b: 60, alpha: 0.4 },
      },
    })
      .png()
      .toBuffer();
    const info = inspectSource(png);
    expect(info.format).toBe("png");
    expect(info.hasAlpha).toBe(true);
    expect(info.width).toBe(12);
    expect(info.height).toBe(8);
  });

  it("detects opaque JPEG", async () => {
    const jpeg = await sharp({
      create: {
        width: 16,
        height: 10,
        channels: 3,
        background: { r: 200, g: 180, b: 160 },
      },
    })
      .jpeg()
      .toBuffer();
    const info = inspectSource(jpeg);
    expect(info.format).toBe("jpeg");
    expect(info.hasAlpha).toBe(false);
    expect(info.width).toBe(16);
    expect(info.height).toBe(10);
  });

  it("marks unknown bytes as unknown", () => {
    expect(inspectSource(new Uint8Array([1, 2, 3, 4])).format).toBe("unknown");
  });
});
