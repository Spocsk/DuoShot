import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import sharp from "sharp";
import { buildExampleZip } from "./example-zip";

describe("example-zip", () => {
  it("packs Harbor slides in the Connect folder contract", async () => {
    const concurrent = await Promise.all(Array.from({ length: 30 }, () => buildExampleZip()));
    for (const result of concurrent) expect(result).toBe(concurrent[0]);
    const zip = await JSZip.loadAsync(concurrent[0]);
    const names = Object.keys(zip.files);
    expect(names).toContain("exampleapp/duo-outer-portrait/01.png");
    expect(names).toContain("exampleapp/duo-inner-portrait/03.png");
    expect(names).not.toContain("exampleapp/duo-inner-landscape/03.png");
    expect(names).toContain("exampleapp/README.txt");

    const images = names.filter((name) => name.endsWith(".png"));
    expect(images).toHaveLength(6);
    for (const name of images) {
      const image = await zip.file(name)!.async("nodebuffer");
      const meta = await sharp(image).metadata();
      const isOuter = name.includes("/duo-outer-");
      expect(meta.width).toBe(isOuter ? 1398 : 2007);
      expect(meta.height).toBe(isOuter ? 2034 : 2853);
      expect(meta.format).toBe("png");
      expect(meta.hasAlpha).toBe(false);
      expect(meta.channels).toBe(3);
      expect(meta.space).toBe("srgb");
    }

    const readme = await zip.file("exampleapp/README.txt")!.async("string");
    expect(readme).toContain("duo-inner-portrait");
    expect(readme).toContain("duo-outer-portrait");
    expect(readme).toContain("duo-outer-portrait: 1398x2034");
    expect(readme).toContain("duo-inner-portrait: 2007x2853");
  });
}, 30_000);
