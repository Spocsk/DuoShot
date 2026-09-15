import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import sharp from "sharp";
import { buildExampleZip } from "./example-zip";

describe("example-zip", () => {
  it("packs Harbor slides in the Connect folder contract", async () => {
    const zip = await JSZip.loadAsync(await buildExampleZip());
    const names = Object.keys(zip.files);
    expect(names).toContain("exampleapp/duo-outer-portrait/01.png");
    expect(names).toContain("exampleapp/duo-inner-landscape/03.png");
    expect(names).not.toContain("exampleapp/duo-inner-portrait/03.png");
    expect(names).toContain("exampleapp/README.txt");

    const outer = await zip.file("exampleapp/duo-outer-portrait/01.png")!.async("nodebuffer");
    const inner = await zip.file("exampleapp/duo-inner-landscape/01.png")!.async("nodebuffer");
    const outerMeta = await sharp(outer).metadata();
    const innerMeta = await sharp(inner).metadata();
    expect(outerMeta.width).toBe(1398);
    expect(outerMeta.height).toBe(2034);
    expect(outerMeta.hasAlpha).toBe(false);
    expect(innerMeta.width).toBe(2853);
    expect(innerMeta.height).toBe(2007);
    expect(innerMeta.hasAlpha).toBe(false);

    const readme = await zip.file("exampleapp/README.txt")!.async("string");
    expect(readme).toContain("duo-inner-landscape");
    expect(readme).toContain("duo-outer-portrait");
    expect(readme).toContain("duo-outer-portrait: 1398x2034");
    expect(readme).toContain("duo-inner-landscape: 2853x2007");
  });
}, 30_000);
