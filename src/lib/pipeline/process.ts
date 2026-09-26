import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { parseHexColor } from "./geometry";
import type { CropTransform, RenderOptions, SizeSpec, TitleFont } from "../specs";
import { hingeBand, JPEG_QUALITY, normalizeCropTransform, textOverlayLayout } from "../specs";
import { compositionMetrics } from "./geometry";

const FONT_SANS = path.join(process.cwd(), "src/lib/pipeline/fonts/sans-bold.ttf");
const FONT_SERIF = path.join(process.cwd(), "src/lib/pipeline/fonts/serif-bold.ttf");

const FONT_B64: Record<TitleFont, string> = {
  sans: readFileSync(FONT_SANS).toString("base64"),
  serif: readFileSync(FONT_SERIF).toString("base64"),
};

function fontFaceCss(font: TitleFont): string {
  return `@font-face{font-family:"DuoShot ${font}";src:url('data:font/ttf;base64,${FONT_B64[font]}') format('truetype');font-weight:700;font-style:normal;}`;
}

function assertPngOrJpeg(format: string | undefined) {
  if (format !== "png" && format !== "jpeg") {
    throw new Error("INPUT_FORMAT");
  }
}

async function rasterizeSvg(svg: string, width: number, height: number): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();
}

async function makeBackground(
  input: Buffer,
  spec: SizeSpec,
  options: RenderOptions,
): Promise<Buffer> {
  if (options.background === "solid") {
    const { r, g, b } = parseHexColor(options.solidColor);
    return sharp({
      create: {
        width: spec.width,
        height: spec.height,
        channels: 3,
        background: { r, g, b },
      },
    })
      .png()
      .toBuffer();
  }

  if (options.background === "gradient") {
    const svg = `<svg width="${spec.width}" height="${spec.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${options.gradientFrom}"/>
          <stop offset="100%" stop-color="${options.gradientTo}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`;
    return rasterizeSvg(svg, spec.width, spec.height);
  }

  return sharp(input)
    .rotate()
    .resize(spec.width, spec.height, { fit: "cover", position: "centre" })
    .blur(28)
    .modulate({ brightness: 0.72, saturation: 0.9 })
    .removeAlpha()
    .png()
    .toBuffer();
}

function titleSvg(spec: SizeSpec, options: RenderOptions): string | null {
  const title = options.title?.trim();
  const subtitle = options.subtitle?.trim();
  if (!title && !subtitle) return null;
  const family = `DuoShot ${options.titleFont}`;
  const systemFamily = options.titleFont === "serif" ? "DejaVu Serif" : "DejaVu Sans";
  const layout = textOverlayLayout(spec, options.titlePosition);
  const fitted = (value: string, size: number) =>
    Array.from(value).length * size * 0.68 > layout.maxWidth
      ? ` textLength="${layout.maxWidth}" lengthAdjust="spacingAndGlyphs"`
      : "";
  return `<svg width="${spec.width}" height="${spec.height}" xmlns="http://www.w3.org/2000/svg">
    <style>${fontFaceCss(options.titleFont)}
      .t{font-family:'${family}','${systemFamily}';fill:#F4F1EA;text-anchor:middle;}
    </style>
    ${title ? `<text class="t" x="${layout.x}" y="${layout.yTitle}" font-size="${layout.titleSize}" font-weight="700"${fitted(title, layout.titleSize)}>${escapeXml(title)}</text>` : ""}
    ${subtitle ? `<text class="t" x="${layout.x}" y="${layout.ySubtitle}" font-size="${layout.subtitleSize}" opacity="0.82"${fitted(subtitle, layout.subtitleSize)}>${escapeXml(subtitle)}</text>` : ""}
  </svg>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function renderScreenshot(
  input: Buffer,
  spec: SizeSpec,
  options: RenderOptions,
  cropTransform?: Partial<CropTransform> | null,
): Promise<Buffer> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  assertPngOrJpeg(meta.format);

  const background = await makeBackground(input, spec, options);
  const swapDimensions = Boolean(meta.orientation && meta.orientation >= 5 && meta.orientation <= 8);
  const sourceWidth = swapDimensions ? meta.height : meta.width;
  const sourceHeight = swapDimensions ? meta.width : meta.height;
  if (!sourceWidth || !sourceHeight) throw new Error("INPUT_DIMENSIONS");
  const transform = normalizeCropTransform(cropTransform, options.fit);
  const metrics = compositionMetrics(sourceWidth, sourceHeight, spec.width, spec.height, transform);
  let foreground: Buffer;
  if (metrics.fit === "contain") {
    foreground = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: spec.width,
        height: spec.height,
        fit: "contain",
        position: "centre",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toColourspace("srgb")
      .png()
      .toBuffer();
  } else {
    const widthControlsScale = sourceWidth / sourceHeight <= spec.width / spec.height;
    const resized = await sharp(input, { failOn: "none" })
      .rotate()
      .resize(widthControlsScale
        ? { width: Math.max(spec.width, Math.ceil(metrics.rect.width)) }
        : { height: Math.max(spec.height, Math.ceil(metrics.rect.height)) })
      .png()
      .toBuffer({ resolveWithObject: true });
    const left = Math.min(resized.info.width - spec.width, Math.max(0, Math.round((resized.info.width - spec.width) * transform.x)));
    const top = Math.min(resized.info.height - spec.height, Math.max(0, Math.round((resized.info.height - spec.height) * transform.y)));
    foreground = await sharp(resized.data)
      .extract({ left, top, width: spec.width, height: spec.height })
      .toColourspace("srgb")
      .png()
      .toBuffer();
  }

  const composites: { input: Buffer; top?: number; left?: number; gravity?: "centre" }[] = [
    { input: foreground, gravity: "centre" },
  ];
  const overlay = titleSvg(spec, options);
  if (overlay) {
    composites.push({ input: await rasterizeSvg(overlay, spec.width, spec.height), gravity: "centre" });
  }
  if (options.burnHinge && spec.slot === "duo-inner") {
    const band = hingeBand(spec);
    const mask = `<svg width="${spec.width}" height="${spec.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${band.x}" y="${band.y}" width="${band.width}" height="${band.height}" fill="rgb(8 10 12 / 0.32)"/>
    </svg>`;
    composites.push({ input: await rasterizeSvg(mask, spec.width, spec.height), gravity: "centre" });
  }

  const { r, g, b } = parseHexColor(options.solidColor);
  const pipeline = sharp(background)
    .composite(composites)
    .flatten({ background: { r, g, b } })
    .removeAlpha()
    .toColourspace("srgb");

  const output =
    options.format === "jpeg"
      ? await pipeline.jpeg({ quality: JPEG_QUALITY, chromaSubsampling: "4:4:4" }).toBuffer()
      : await pipeline.png({ compressionLevel: 4 }).toBuffer();

  await assertExactOutput(output, spec, options.format);
  return output;
}

export async function assertExactOutput(
  buffer: Buffer,
  spec: SizeSpec,
  format: RenderOptions["format"],
): Promise<void> {
  const meta = await sharp(buffer).metadata();
  if (meta.width !== spec.width || meta.height !== spec.height) {
    throw new Error(
      `PIXEL_MISMATCH expected ${spec.width}x${spec.height} got ${meta.width}x${meta.height}`,
    );
  }
  if (meta.hasAlpha) {
    throw new Error("ALPHA_FORBIDDEN");
  }
  if (meta.channels && meta.channels !== 3) {
    throw new Error("RGB_REQUIRED");
  }
  if (meta.format !== format) {
    throw new Error(`FORMAT_MISMATCH expected ${format} got ${meta.format}`);
  }
  if (meta.space && meta.space !== "srgb") {
    throw new Error("RGB_REQUIRED");
  }
}
