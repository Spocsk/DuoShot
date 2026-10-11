import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { JPEG_QUALITY, SIZE_SPECS, type Locale } from "../specs";

export const DEMO_REVIEW_ID = "harbor";

/** Bumped when the generated Harbor images change, so cached demo media is not reused (see tool/demo.tsx). */
const HARBOR_MEDIA_VERSION = 2;

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
    headline: "1.4 m",
  },
  {
    kicker: "Tide",
    place: "2.1 m",
    metric: "High 18:12 · Rising",
    sideKicker: "Hours",
    sidePlace: "Incoming",
    sideMetric: "High 18:12",
    headline: "2.1 m",
  },
  {
    kicker: "Spots",
    place: "North",
    metric: "Best window · 16:00",
    sideKicker: "Now",
    sidePlace: "Cove",
    sideMetric: "Glassy · 14 °C",
    headline: "1.4 m",
  },
] as const;

export type HarborSlide = { [K in keyof (typeof HARBOR_SLIDES)[number]]: string };

/** French Harbor copy, matching the landing (harbor-ui.tsx). Harbor stays a fictional app in both languages. */
const HARBOR_SLIDES_FR: readonly HarborSlide[] = [
  { kicker: "Aujourd’hui", place: "Nord", metric: "1,4 m · 12 s · ONO", sideKicker: "Spots", sidePlace: "Récif ouest", sideMetric: "Propre · lisse", headline: "1,4 m" },
  { kicker: "Marée", place: "2,1 m", metric: "Pleine mer 18:12 · Montante", sideKicker: "Heures", sidePlace: "À venir", sideMetric: "Pleine mer 18:12", headline: "2,1 m" },
  { kicker: "Spots", place: "Nord", metric: "Meilleur créneau · 16:00", sideKicker: "Maintenant", sidePlace: "Crique", sideMetric: "Lisse · 14 °C", headline: "1,4 m" },
];

const HARBOR_LABELS = {
  en: { westReef: "West reef", clean: "Clean", cove: "Cove", glassy: "Glassy", incoming: "INCOMING", high: "High 18:12" },
  fr: { westReef: "Récif ouest", clean: "Propre", cove: "Crique", glassy: "Lisse", incoming: "À VENIR", high: "Pleine mer 18:12" },
} as const;
type HarborLabels = (typeof HARBOR_LABELS)[Locale];

export function harborSlides(locale: Locale = "en"): readonly HarborSlide[] {
  return locale === "fr" ? HARBOR_SLIDES_FR : HARBOR_SLIDES;
}

export function isDemoReview(id: string): boolean {
  return id === DEMO_REVIEW_ID;
}

function fontFace(): string {
  return `<style>@font-face{font-family:"Harbor Sans";src:url('data:font/ttf;base64,${FONT_B64}') format('truetype');}
      .t{font-family:'Harbor Sans','DejaVu Sans';fill:#f7f9f8;}.small{font-size:28px;letter-spacing:2px;opacity:.86}</style>`;
}

export function harborOuterSvg(width: number, height: number, slide: HarborSlide) {
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
    <text class="t" x="${pad}" y="${Math.round(height * 0.37)}" font-size="${metricSize}">${slide.headline}</text>
    <text class="t" x="${pad}" y="${Math.round(height * 0.41)}" font-size="${subSize}" opacity=".88">${slide.metric}</text>
  </svg>`;
}

/**
 * Open-screen capture for the portrait inner slot (2007 × 2853). The open iPhone Duo folds across its long side
 * (Apple: 164.6 × 117.8 mm open, 84.1 × 117.8 mm closed), so in portrait the fold is a horizontal band across the
 * middle height. The layout is two panes, top and bottom, and keeps the middle band (see hingeBand) empty.
 */
export function harborInnerSvg(width: number, height: number, slide: HarborSlide, labels: HarborLabels = HARBOR_LABELS.en) {
  const pane = height / 2;
  const titleSize = Math.round(width * 0.075);
  const subSize = Math.round(width * 0.02);
  const pad = Math.round(width * 0.07);
  const column = width / 2;
  const crease = Math.max(10, Math.round(height * 0.006));
  const yKicker = Math.round(pane * 0.16);
  const yPlace = Math.round(pane * 0.3);
  const yMetric = Math.round(pane * 0.37);
  const barBase = pane * 0.4;
  const barSpan = width - pad - (column + pad * 0.5);
  const bars = [0.28, 0.47, 0.64, 0.52, 0.36, 0.24].map((scale, index) => {
    const x = column + pad * 0.5 + index * (barSpan / 6);
    const barHeight = pane * 0.36 * scale;
    return `<rect x="${x}" y="${barBase - barHeight}" width="${width * 0.03}" height="${barHeight}" rx="${width * 0.015}" fill="#eff8f8" opacity=".75"/>`;
  }).join("");
  const tide = (ratio: number) => pane * ratio;
  const spotRows = [
    [labels.westReef, labels.clean],
    [slide.sidePlace, slide.sideMetric],
    [labels.cove, labels.glassy],
  ].map(([name, metric], index) => {
    const y = pane + pane * (0.24 + index * 0.24);
    return `<rect x="${pad}" y="${y}" width="${width - pad * 2}" height="${pane * 0.19}" rx="${width * 0.025}" fill="#163f50" opacity=".48"/>
      <text class="t" x="${pad * 1.5}" y="${y + pane * 0.11}" font-size="${subSize}">${name}</text>
      <text class="t" x="${width - pad * 1.5}" y="${y + pane * 0.11}" font-size="${Math.round(subSize * 0.85)}" text-anchor="end">${metric}</text>`;
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
    <rect width="${width}" height="${pane}" fill="url(#gl)"/>
    <rect y="${pane}" width="${width}" height="${pane}" fill="url(#gr)"/>
    <rect x="0" y="${pane - crease / 2}" width="${width}" height="${crease}" fill="#1d3641" opacity=".38"/>
    <text class="t" x="${pad}" y="${yKicker}" font-size="${subSize}" opacity=".86">${slide.kicker.toUpperCase()}</text>
    <text class="t" x="${pad}" y="${yPlace}" font-size="${titleSize}">${slide.place}</text>
    <text class="t" x="${pad}" y="${yMetric}" font-size="${subSize}" opacity=".86">${slide.metric}</text>
    ${bars}
    <path d="M${pad} ${tide(0.56)} C${width * 0.25} ${tide(0.56)}, ${width * 0.3} ${tide(0.48)}, ${width * 0.4} ${tide(0.52)} S${width * 0.58} ${tide(0.6)}, ${width * 0.65} ${tide(0.55)} S${width * 0.83} ${tide(0.49)}, ${width - pad} ${tide(0.53)}" fill="none" stroke="#eff8f8" stroke-width="${Math.max(4, width * 0.003)}" stroke-linecap="round" opacity=".82"/>
    <rect x="${pad}" y="${pane * 0.66}" width="${width - pad * 2}" height="${pane * 0.18}" rx="${width * 0.025}" fill="#163f50" opacity=".56"/>
    <text class="t" x="${pad * 1.5}" y="${pane * 0.73}" font-size="${Math.round(subSize * 0.83)}">${labels.incoming}</text>
    <text class="t" x="${pad * 1.5}" y="${pane * 0.8}" font-size="${Math.round(subSize * 1.55)}">${labels.high}</text>
    <text class="t" x="${pad}" y="${pane + yKicker}" font-size="${subSize}" opacity=".86">${slide.sideKicker.toUpperCase()}</text>
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

export async function harborSlidePng(index: number, side: "outer" | "inner", locale: Locale = "en"): Promise<Buffer | null> {
  const slide = harborSlides(locale)[index];
  if (!slide) return null;
  const spec = SIZE_SPECS.find((item) => item.id === (side === "outer" ? "outer-p" : "inner-p"));
  if (!spec) return null;
  const svg =
    side === "outer"
      ? harborOuterSvg(spec.width, spec.height, slide)
      : harborInnerSvg(spec.width, spec.height, slide, HARBOR_LABELS[locale]);
  return pngFromSvg(svg, spec.width, spec.height);
}

const jpegCache = new Map<string, Buffer>();

export async function harborReviewJpeg(index: number, side: "outer" | "inner", locale: Locale = "en"): Promise<Buffer | null> {
  const key = `${index}-${side}-${locale}`;
  const hit = jpegCache.get(key);
  if (hit) return hit;
  const png = await harborSlidePng(index, side, locale);
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
      outer: `/api/reviews/${DEMO_REVIEW_ID}/media?slide=${index}&side=outer&v=${HARBOR_MEDIA_VERSION}`,
      inner: `/api/reviews/${DEMO_REVIEW_ID}/media?slide=${index}&side=inner&v=${HARBOR_MEDIA_VERSION}`,
    })),
  };
}
