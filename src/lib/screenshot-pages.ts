import { getTranslator } from "./i18n";
import { SIZE_SPECS, type Locale } from "./specs";

export const SCREENSHOT_SIZES = ["1398x2034", "2007x2853", "1206x2622", "1320x2868"] as const;
export type ScreenshotSize = typeof SCREENSHOT_SIZES[number];
export const SCREENSHOT_VERIFIED_ON = "2026-11-13";
/** The iPhone Duo size pages (1398x2034, 2007x2853) were re-verified against Apple later than the rest. */
export const DUO_SIZES_VERIFIED_ON = "2026-11-15";

/** "Verified on" date for a size page: the Duo pages carry DUO_SIZES_VERIFIED_ON, the rest SCREENSHOT_VERIFIED_ON. */
export function sizeVerifiedOn(size: ScreenshotSize): string {
  return size === "1398x2034" || size === "2007x2853" ? DUO_SIZES_VERIFIED_ON : SCREENSHOT_VERIFIED_ON;
}

/** Aspect ratio for the "At a glance" box: reduced integer ratio plus a localized decimal. */
export function aspectRatio(width: number, height: number, locale: Locale): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const decimal = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 }).format(height / width);
  return `${width / divisor}:${height / divisor} (≈ 1:${decimal})`;
}

export function sizePageCopy(locale: Locale, size: ScreenshotSize) {
  const { t } = getTranslator(locale);
  const copyKey = size === "1320x2868" ? "size_69" : size === "1206x2622" ? "size_63" : size === "1398x2034" ? "size_outer" : "size_inner";
  const portrait = SIZE_SPECS.find((spec) => `${spec.width}x${spec.height}` === size)!;
  const landscape = SIZE_SPECS.find((spec) => spec.slot === portrait.slot && spec.width === portrait.height && spec.height === portrait.width)!;
  return {
    title: t(`${copyKey}_title`),
    description: t(`${copyKey}_description`),
    intro: t(`${copyKey}_intro`),
    portrait,
    landscape,
    related: SCREENSHOT_SIZES.filter((related) => related !== size),
  };
}

export const SPECS_PAGE_COPY = {
  fr: {
    title: "Tailles des captures iPhone Duo et zone du pli",
    description: "Tailles iPhone Duo et repères du pli. App Store Connect : iPhone Dynamic Island (écran moyen, 6,3″) requis, 6,9″ accepté. Dépôt Duo non testé.",
  },
  en: {
    title: "iPhone Duo screenshot size, safe area & fold",
    description: "iPhone Duo screenshot sizes and fold guides. iPhone with Dynamic Island (medium display, 6.3\") required; 6.9″ also accepted. Duo uploads untested.",
  },
};
