import { getTranslator } from "./i18n";
import { duoSpec, iphone63Spec, type Locale } from "./specs";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "./screenshot-copy";

export const SCREENSHOT_SIZES = ["1398x2034", "2007x2853", "1206x2622"] as const;
export type ScreenshotSize = typeof SCREENSHOT_SIZES[number];
export const SCREENSHOT_VERIFIED_ON = "2026-10-13";

export function sizePageCopy(locale: Locale, size: ScreenshotSize) {
  const { t } = getTranslator(locale);
  const outer = size === "1398x2034";
  const iphone63 = size === "1206x2622";
  return {
    title: t(iphone63 ? "size_63_title" : outer ? "size_outer_title" : "size_inner_title"),
    description: t(iphone63 ? "size_63_description" : outer ? "size_outer_description" : "size_inner_description"),
    intro: t(iphone63 ? "size_63_intro" : outer ? "size_outer_intro" : "size_inner_intro"),
    portrait: iphone63 ? iphone63Spec("portrait") : duoSpec(outer ? "duo-outer" : "duo-inner", "portrait"),
    landscape: iphone63 ? iphone63Spec("landscape") : duoSpec(outer ? "duo-outer" : "duo-inner", "landscape"),
    related: SCREENSHOT_SIZES.filter((related) => related !== size),
  };
}

export const SPECS_PAGE_COPY = {
  fr: {
    title: "Tailles des captures iPhone Duo et iPhone 6,3 pouces",
    description: `App Store Connect : iPhone 6,3″ requis, 1206×2622 ou 1179×2556 px ; 6,9″ optionnel. Duo : ${OUTER_PORTRAIT} et ${INNER_PORTRAIT} px, un seul emplacement.`,
  },
  en: {
    title: "iPhone Duo and 6.3-inch iPhone screenshot sizes",
    description: `App Store Connect: required 6.3″ iPhone, 1206×2622 or 1179×2556 px; optional 6.9″. Duo: ${OUTER_PORTRAIT} and ${INNER_PORTRAIT} px, one slot.`,
  },
};
