import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { JPEG_QUALITY, SIZE_SPECS } from "../specs";

export const DEMO_REVIEW_ID = "harbor";

export const EXAMPLE_ZIP_TREE = [
  "exampleapp/duo-outer-portrait/01.png",
  "exampleapp/duo-inner-portrait/01.png",
  "exampleapp/README.txt",
] as const;

const FONT = path.join(process.cwd(), "src/lib/pipeline/fonts/sans-bold.ttf");
const FONT_B64 = readFileSync(FONT).toString("base64");

export const HARBOR_SLIDES = [
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

export function isDemoReview(id: string): boolean {
  return id === DEMO_REVIEW_ID;
}

function fontFace(): string {
  return `<style>@font-face{font-family:"Harbor Sans";src:url('data:font/ttf;base64,${FONT_B64}') format('truetype');}
      .t{font-family:'Harbor Sans','DejaVu Sans';fill:#f7f9f8;}.small{font-size:28px;letter-spacing:2px;opacity:.86}</style>`;
}

export function harborOuterSvg(width: number, height: number, slide: (typeof HARBOR_SLIDES)[number]) {
  const titleSize = Math.round(width * 0.13);
  const metricSize = Math.round(width * 0.18);
  const subSize = Math.round(width * 0.028);
  const pad = Math.round(width * 0.1);
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#89a9ad"/>
        <stop offset="48%" stop-color="#7398a0"/>
        <stop offset="100%" stop-color="#1d4659"/>
      </linearGradient>
      <radialGradient id="sun"><stop stop-color="#f9e7c6" stop-opacity=".8"/><stop offset="1" stop-color="#f9e7c6" stop-opacity="0"/></radialGradient>
      ${fontFace()}
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width * 0.82}" cy="${height * 0.12}" r="${width * 0.62}" fill="url(#sun)"/>
    <path d="M0 ${height * 0.84} Q${width * 0.52} ${height * 0.67} ${width} ${height * 0.79} L${width} ${height} H0Z" fill="#1f4a5a" opacity=".94"/>
    <text class="t" x="${pad}" y="${Math.round(height * 0.085)}" font-size="${subSize}">Harbor</text>
    <text class="t" x="${pad}" y="${Math.round(height * 0.225)}" font-size="${titleSize}">${slide.place}</text>
    <text class="t" x="${pad}" y="${Math.round(height * 0.37)}" font-size="${metricSize}">${slide.kicker === "Tide" ? slide.place : "1.4 m"}</text>
    <text class="t" x="${pad}" y="${Math.round(height * 0.41)}" font-size="${subSize}" opacity=".88">${slide.metric}</text>
  </svg>`;
}

export function harborInnerSvg(width: number, height: number, slide: (typeof HARBOR_SLIDES)[number]) {
  const pane = width / 2;
  const titleSize = Math.round(pane * 0.13);
  const subSize = Math.round(pane * 0.031);
  const pad = Math.round(pane * 0.1);
  const yKicker = Math.round(height * 0.105);
  const yPlace = Math.round(height * 0.205);
  const yMetric = Math.round(height * 0.252);
  const crease = Math.max(10, Math.round(width * 0.008));
  const bars = [0.28, 0.47, 0.64, 0.52, 0.36, 0.24].map((scale, index) => {
    const x = pad + index * ((pane - pad * 2) / 6);
    const barHeight = height * 0.14 * scale;
    return `<rect x="${x}" y="${height * 0.46 - barHeight}" width="${pane * 0.045}" height="${barHeight}" rx="${pane * 0.0225}" fill="#eff8f8" opacity=".75"/>`;
  }).join("");
  const spotRows = [
    ["West reef", "Clean"],
    [slide.sidePlace, slide.sideMetric],
    ["Cove", "Glassy"],
  ].map(([name, metric], index) => {
    const y = height * (0.27 + index * 0.17);
    return `<rect x="${pane + pad}" y="${y}" width="${pane - pad * 2}" height="${height * 0.115}" rx="${pane * 0.05}" fill="#163f50" opacity=".48"/>
      <text class="t" x="${pane + pad * 1.5}" y="${y + height * 0.068}" font-size="${subSize}">${name}</text>
      <text class="t" x="${width - pad * 1.5}" y="${y + height * 0.068}" font-size="${Math.round(subSize * 0.85)}" text-anchor="end">${metric}</text>`;
  }).join("");
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#82a4aa"/>
        <stop offset="52%" stop-color="#56828c"/>
        <stop offset="100%" stop-color="#214d5e"/>
      </linearGradient>
      <linearGradient id="gr" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8b8a1"/>
        <stop offset="44%" stop-color="#71959b"/>
        <stop offset="100%" stop-color="#174459"/>
      </linearGradient>
      ${fontFace()}
    </defs>
    <rect width="${pane}" height="${height}" fill="url(#gl)"/>
    <rect x="${pane}" width="${pane}" height="${height}" fill="url(#gr)"/>
    <rect x="${pane - crease / 2}" y="0" width="${crease}" height="${height}" fill="#1d3641" opacity=".38"/>
    <text class="t" x="${pad}" y="${yKicker}" font-size="${subSize}" opacity=".86">${slide.kicker.toUpperCase()}</text>
    <text class="t" x="${pad}" y="${yPlace}" font-size="${titleSize}">${slide.place}</text>
    <text class="t" x="${pad}" y="${yMetric}" font-size="${subSize}" opacity=".86">${slide.metric}</text>
    ${bars}
    <path d="M${pad} ${height * 0.6} C${pane * 0.25} ${height * 0.6}, ${pane * 0.3} ${height * 0.52}, ${pane * 0.4} ${height * 0.56} S${pane * 0.58} ${height * 0.64}, ${pane * 0.65} ${height * 0.59} S${pane * 0.83} ${height * 0.53}, ${pane - pad} ${height * 0.57}" fill="none" stroke="#eff8f8" stroke-width="${Math.max(4, width * 0.003)}" stroke-linecap="round" opacity=".82"/>
    <rect x="${pad}" y="${height * 0.78}" width="${pane - pad * 2}" height="${height * 0.13}" rx="${pane * 0.05}" fill="#163f50" opacity=".56"/>
    <text class="t" x="${pad * 1.5}" y="${height * 0.825}" font-size="${Math.round(subSize * 0.83)}">INCOMING</text>
    <text class="t" x="${pad * 1.5}" y="${height * 0.875}" font-size="${Math.round(subSize * 1.55)}">High 18:12</text>
    <text class="t" x="${pane + pad}" y="${yKicker}" font-size="${subSize}" opacity=".86">${slide.sideKicker.toUpperCase()}</text>
    ${spotRows}
  </svg>`;
}

export async function pngFromSvg(svg: string, width: number, height: number): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(width, height)
    .removeAlpha()
    .toColourspace("srgb")
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function harborSlidePng(index: number, side: "outer" | "inner"): Promise<Buffer | null> {
  const slide = HARBOR_SLIDES[index];
  if (!slide) return null;
  const spec = SIZE_SPECS.find((item) => item.id === (side === "outer" ? "outer-p" : "inner-p"));
  if (!spec) return null;
  const svg =
    side === "outer"
      ? harborOuterSvg(spec.width, spec.height, slide)
      : harborInnerSvg(spec.width, spec.height, slide);
  return pngFromSvg(svg, spec.width, spec.height);
}

const jpegCache = new Map<string, Buffer>();

export async function harborReviewJpeg(index: number, side: "outer" | "inner"): Promise<Buffer | null> {
  const key = `${index}-${side}`;
  const hit = jpegCache.get(key);
  if (hit) return hit;
  const png = await harborSlidePng(index, side);
  if (!png) return null;
  const jpeg = await sharp(png)
    .jpeg({ quality: JPEG_QUALITY, chromaSubsampling: "4:4:4" })
    .toBuffer();
  jpegCache.set(key, jpeg);
  return jpeg;
}

export function harborReviewPayload() {
  return {
    set_name: "Harbor",
    client_name: "Harbor demo",
    orientation: "portrait",
    status: "pending",
    comment: null as string | null,
    demo: true,
    slides: HARBOR_SLIDES.map((_, index) => ({
      index,
      clone: "ok",
      outer: `/api/reviews/${DEMO_REVIEW_ID}/media?slide=${index}&side=outer`,
      inner: `/api/reviews/${DEMO_REVIEW_ID}/media?slide=${index}&side=inner`,
    })),
  };
}
