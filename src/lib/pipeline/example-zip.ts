import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SIZE_SPECS } from "../specs";
import { buildZip } from "./zip";

const FONT = path.join(process.cwd(), "src/lib/pipeline/fonts/serif-bold.ttf");
const FONT_B64 = readFileSync(FONT).toString("base64");

const SLIDES = [
  {
    kicker: "Today",
    place: "North",
    metric: "1.4 m · 12 s · WNW",
    sideKicker: "Spots",
    sidePlace: "West reef",
    sideMetric: "Clean · glassy",
  },
  {
    kicker: "Tide",
    place: "2.1 m",
    metric: "High 18:12 · Rising",
    sideKicker: "Hours",
    sidePlace: "Incoming",
    sideMetric: "High 18:12",
  },
  {
    kicker: "Spots",
    place: "North",
    metric: "Best window · 16:00",
    sideKicker: "Now",
    sidePlace: "Cove",
    sideMetric: "Glassy · 14 °C",
  },
] as const;

function fontFace(): string {
  return `<style>@font-face{font-family:"DuoShot serif";src:url('data:font/ttf;base64,${FONT_B64}') format('truetype');}
      .t{font-family:'DuoShot serif';fill:#f7f3ec;}</style>`;
}

function harborOuterSvg(width: number, height: number, slide: (typeof SLIDES)[number]) {
  const titleSize = Math.round(width * 0.09);
  const subSize = Math.round(width * 0.028);
  const pad = Math.round(width * 0.08);
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d4c3ae"/>
        <stop offset="45%" stop-color="#9aa8a4"/>
        <stop offset="100%" stop-color="#3e4d54"/>
      </linearGradient>
      ${fontFace()}
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text class="t" x="${pad}" y="${Math.round(height * 0.12)}" font-size="${subSize}" opacity="0.72">${slide.kicker}</text>
    <text class="t" x="${pad}" y="${Math.round(height * 0.22)}" font-size="${titleSize}">${slide.place}</text>
    <text class="t" x="${pad}" y="${Math.round(height * 0.3)}" font-size="${subSize}" opacity="0.82">${slide.metric}</text>
    <text class="t" x="${width / 2}" y="${Math.round(height * 0.92)}" font-size="${subSize}" text-anchor="middle" opacity="0.7">Harbor</text>
  </svg>`;
}

function harborInnerSvg(width: number, height: number, slide: (typeof SLIDES)[number]) {
  const pane = width / 2;
  const titleSize = Math.round(pane * 0.1);
  const subSize = Math.round(pane * 0.036);
  const pad = Math.round(pane * 0.1);
  const yKicker = Math.round(height * 0.14);
  const yPlace = Math.round(height * 0.28);
  const yMetric = Math.round(height * 0.38);
  const crease = Math.max(10, Math.round(width * 0.008));
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d4c3ae"/>
        <stop offset="55%" stop-color="#8fa09a"/>
        <stop offset="100%" stop-color="#3e4d54"/>
      </linearGradient>
      <linearGradient id="gr" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#cbb79a"/>
        <stop offset="50%" stop-color="#7f8f88"/>
        <stop offset="100%" stop-color="#2f3d44"/>
      </linearGradient>
      ${fontFace()}
    </defs>
    <rect width="${pane}" height="${height}" fill="url(#gl)"/>
    <rect x="${pane}" width="${pane}" height="${height}" fill="url(#gr)"/>
    <rect x="${pane - crease / 2}" y="0" width="${crease}" height="${height}" fill="rgb(8 10 12 / 0.22)"/>
    <text class="t" x="${pad}" y="${yKicker}" font-size="${subSize}" opacity="0.72">${slide.kicker}</text>
    <text class="t" x="${pad}" y="${yPlace}" font-size="${titleSize}">${slide.place}</text>
    <text class="t" x="${pad}" y="${yMetric}" font-size="${subSize}" opacity="0.82">${slide.metric}</text>
    <text class="t" x="${pane + pad}" y="${yKicker}" font-size="${subSize}" opacity="0.72">${slide.sideKicker}</text>
    <text class="t" x="${pane + pad}" y="${yPlace}" font-size="${titleSize}">${slide.sidePlace}</text>
    <text class="t" x="${pane + pad}" y="${yMetric}" font-size="${subSize}" opacity="0.82">${slide.sideMetric}</text>
  </svg>`;
}

async function pngFromSvg(svg: string, width: number, height: number): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(width, height)
    .removeAlpha()
    .toColourspace("srgb")
    .png({ compressionLevel: 9 })
    .toBuffer();
}

let cached: Buffer | null = null;

export async function buildExampleZip(): Promise<Buffer> {
  if (cached) return cached;
  const outer = SIZE_SPECS.find((spec) => spec.id === "outer-p")!;
  const inner = SIZE_SPECS.find((spec) => spec.id === "inner-l")!;
  const images = [];
  for (const [index, slide] of SLIDES.entries()) {
    images.push({
      spec: outer,
      index,
      buffer: await pngFromSvg(harborOuterSvg(outer.width, outer.height, slide), outer.width, outer.height),
    });
    images.push({
      spec: inner,
      index,
      buffer: await pngFromSvg(harborInnerSvg(inner.width, inner.height, slide), inner.width, inner.height),
    });
  }
  cached = await buildZip({
    appName: "ExampleApp",
    clientSlug: null,
    orientation: "portrait",
    branded: true,
    include69: false,
    format: "png",
    images,
    flattenAlpha: false,
    cloneScores: [
      { index: 0, distance: 32, label: "ok" },
      { index: 1, distance: 28, label: "ok" },
      { index: 2, distance: 30, label: "ok" },
    ],
  });
  return cached;
}
