import { getTranslator } from "./i18n";
import { SIZE_SPECS, type Locale } from "./specs";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "./screenshot-copy";

export const SCREENSHOT_SIZES = ["1398x2034", "2007x2853", "1206x2622", "1320x2868"] as const;
export type ScreenshotSize = typeof SCREENSHOT_SIZES[number];
export const SCREENSHOT_VERIFIED_ON = "2026-10-13";

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
    title: "Captures iPhone Duo 1398×2034, 2007×2853, 1206×2622",
    description: `App Store Connect : iPhone 6,3″ requis, 1206×2622 ou 1179×2556 px ; 6,9″ optionnel, 1320×2868 px avec Indie et Studio. Duo : ${OUTER_PORTRAIT} et ${INNER_PORTRAIT} px, un seul emplacement.`,
  },
  en: {
    title: "iPhone Duo sizes: 1398×2034, 2007×2853, 1206×2622",
    description: `App Store Connect: required 6.3″ iPhone, 1206×2622 or 1179×2556 px; optional 6.9″, 1320×2868 px with Indie and Studio. Duo: ${OUTER_PORTRAIT} and ${INNER_PORTRAIT} px, one slot.`,
  },
};
