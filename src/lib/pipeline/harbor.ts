import sharp from "sharp";
import { JPEG_QUALITY, SIZE_SPECS, type Locale } from "../specs";
import { HARBOR_SLIDE_IDS, harborScreenSvg } from "./harbor-screens";

export const DEMO_REVIEW_ID = "harbor";

/** Bumped when the generated Harbor images change, so cached demo media is not reused (see tool/demo.tsx). */
const HARBOR_MEDIA_VERSION = 3;

export const EXAMPLE_ZIP_TREE = [
  "exampleapp/duo-outer-portrait/01.png",
  "exampleapp/duo-inner-portrait/01.png",
  "exampleapp/README.txt",
] as const;

/** The three Harbor pairs: today's forecast, tides, spots. The drawing lives in harbor-screens.ts. */
export const HARBOR_SLIDES = HARBOR_SLIDE_IDS;

export function isDemoReview(id: string): boolean {
  return id === DEMO_REVIEW_ID;
}

/** Full-size SVG of one Harbor screen at its portrait Duo export size. */
export function harborSvg(index: number, side: "outer" | "inner", locale: Locale = "en"): { svg: string; width: number; height: number } | null {
  const spec = SIZE_SPECS.find((item) => item.id === (side === "outer" ? "outer-p" : "inner-p"));
  if (!spec) return null;
  const svg = harborScreenSvg(index, side, locale, spec.width, spec.height);
  return svg ? { svg, width: spec.width, height: spec.height } : null;
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
  const screen = harborSvg(index, side, locale);
  if (!screen) return null;
  return pngFromSvg(screen.svg, screen.width, screen.height);
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
