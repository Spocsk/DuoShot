import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import sharp from "sharp";
import { DEFAULT_RENDER_OPTIONS, duoSpec } from "../specs";
import { composeZipImages, reviewPairJpegs } from "./compose";
import { buildZip } from "./zip";

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
  it("fills the device canvas by default", () => {
    expect(DEFAULT_RENDER_OPTIONS.fit).toBe("cover");
  });

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

  it("builds an opaque, exact-pixel ZIP for every enabled shelf", async () => {
    const input = await sourcePng();
    const options = {
      ...DEFAULT_RENDER_OPTIONS,
      title: "Product title",
      subtitle: "Client approved",
      format: "png" as const,
    };
    const { images, flattenAlpha, compositionWarnings } = await composeZipImages({
      outerBuffers: [input],
      innerBuffers: [input],
      options,
      include69: true,
      plan: "indie",
    });
    const archive = await JSZip.loadAsync(
      await buildZip({
        appName: "My App",
        clientSlug: "Acme",
        orientation: "portrait",
        branded: false,
        include69: true,
        format: "png",
        images,
        flattenAlpha,
        compositionWarnings,
      }),
    );

    expect(flattenAlpha).toBe(true);
    expect(Object.keys(archive.files)).toEqual(expect.arrayContaining([
      "acme/my-app/README.txt",
      "acme/my-app/duo-outer-portrait/01.png",
      "acme/my-app/duo-inner-portrait/01.png",
      "acme/my-app/iphone-69-portrait/1320x2868/01.png",
      "acme/my-app/iphone-69-portrait/1290x2796/01.png",
      "acme/my-app/iphone-69-portrait/1260x2736/01.png",
    ]));

    for (const image of images) {
      const folder = image.spec.slot === "iphone-69"
        ? `iphone-69-portrait/${image.spec.width}x${image.spec.height}`
        : `${image.spec.slot}-portrait`;
      const file = archive.file(`acme/my-app/${folder}/01.png`);
      expect(file).toBeTruthy();
      const meta = await sharp(await file!.async("nodebuffer")).metadata();
      expect(meta.width).toBe(image.spec.width);
      expect(meta.height).toBe(image.spec.height);
      expect(meta.format).toBe("png");
      expect(meta.hasAlpha).toBe(false);
      expect(meta.channels).toBe(3);
      expect(meta.space).toBe("srgb");
    }

    const readme = await archive.file("acme/my-app/README.txt")!.async("string");
    expect(readme).toContain("Alpha: flattened (source had transparency)");
    expect(readme).toContain("duo-outer-portrait: 1398x2034");
    expect(readme).toContain("duo-inner-portrait: 2007x2853");
    expect(readme).toContain("Composition warnings:");
    expect(readme).toContain("upscale");
  }, 30_000);
});
