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

async function landmarkPng(): Promise<Buffer> {
  const width = 300;
  const height = 300;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = y < 30 ? [255, 255, 0] : y >= 270 ? [0, 255, 255] : x < 100 ? [255, 0, 0] : x < 200 ? [0, 255, 0] : [0, 0, 255];
      pixels.set(color, (y * width + x) * 3);
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

async function samplePng(buffer: Buffer, x: number, y: number): Promise<number[]> {
  const { data } = await sharp(buffer).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return [...data.subarray(0, 3)];
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

  it("keeps ten closed/open pairs in order in a real ZIP", async () => {
    const input = await sourcePng();
    const { images } = await composeZipImages({
      outerBuffers: Array(10).fill(input),
      innerBuffers: Array(10).fill(input),
      options: { ...DEFAULT_RENDER_OPTIONS, format: "jpeg" },
      include69: false,
      plan: "indie",
    });
    expect(images).toHaveLength(20);
    const zip = await JSZip.loadAsync(await buildZip({
      appName: "Ten Pairs", orientation: "portrait", branded: false,
      include69: false, format: "jpeg", images,
    }));
    expect(zip.file("ten-pairs/duo-outer-portrait/10.jpg")).toBeTruthy();
    expect(zip.file("ten-pairs/duo-inner-portrait/10.jpg")).toBeTruthy();
    expect(zip.file("ten-pairs/duo-outer-portrait/11.jpg")).toBeNull();
  }, 60_000);

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

  it("keeps zoom, focal position, and Smart Fit in the PNGs extracted from the ZIP", async () => {
    const input = await landmarkPng();
    const { images } = await composeZipImages({
      outerBuffers: [input, input],
      innerBuffers: [input, input],
      options: { ...DEFAULT_RENDER_OPTIONS, background: "solid", solidColor: "#112233", format: "png" },
      transforms: {
        outer: [
          { fit: "cover", x: 1, y: 1, zoom: 1.2 },
          { fit: "smart", x: 1, y: 1, zoom: 1.2 },
        ],
        inner: [
          { fit: "cover", x: 0, y: 0, zoom: 1.2 },
          { fit: "smart", x: 0, y: 0, zoom: 1.2 },
        ],
      },
      include69: false,
      plan: "free",
    });
    const zip = await JSZip.loadAsync(await buildZip({
      appName: "Landmarks", orientation: "portrait", branded: false,
      include69: false, format: "png", images,
    }));
    const read = async (slot: "outer" | "inner", index: number) => zip.file(`landmarks/duo-${slot}-portrait/0${index}.png`)!.async("nodebuffer");
    const outerCover = await read("outer", 1);
    const innerCover = await read("inner", 1);
    const outerSmart = await read("outer", 2);
    expect(await samplePng(outerCover, 30, 1000)).toEqual([0, 255, 0]);
    expect(await samplePng(outerCover, 1360, 1000)).toEqual([0, 0, 255]);
    expect(await samplePng(outerCover, 700, 2000)).toEqual([0, 255, 255]);
    expect(await samplePng(innerCover, 30, 1400)).toEqual([255, 0, 0]);
    expect(await samplePng(innerCover, 1950, 1400)).toEqual([0, 255, 0]);
    expect(await samplePng(innerCover, 1000, 20)).toEqual([255, 255, 0]);
    expect(await samplePng(outerSmart, 700, 20)).toEqual([17, 34, 51]);
    expect(await samplePng(outerSmart, 700, 1000)).toEqual([0, 255, 0]);
  }, 30_000);
});
