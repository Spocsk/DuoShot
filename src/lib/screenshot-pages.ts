import { getTranslator } from "./i18n";
import { duoSpec, type Locale } from "./specs";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "./screenshot-copy";

export const SCREENSHOT_SIZES = ["1398x2034", "2007x2853"] as const;
export type ScreenshotSize = typeof SCREENSHOT_SIZES[number];
export const SCREENSHOT_VERIFIED_ON = "2026-10-13";

export function sizePageCopy(locale: Locale, size: ScreenshotSize) {
  const { t } = getTranslator(locale);
  const outer = size === "1398x2034";
  return {
    title: t(outer ? "size_outer_title" : "size_inner_title"),
    description: t(outer ? "size_outer_description" : "size_inner_description"),
    intro: t(outer ? "size_outer_intro" : "size_inner_intro"),
    portrait: duoSpec(outer ? "duo-outer" : "duo-inner", "portrait"),
    landscape: duoSpec(outer ? "duo-outer" : "duo-inner", "landscape"),
    related: outer ? "2007x2853" as const : "1398x2034" as const,
  };
}

export const SPECS_PAGE_COPY = {
  fr: {
    title: "Tailles des captures iPhone Duo : 1398×2034 et 2007×2853",
    description: `Dimensions App Store Connect : écran externe ${OUTER_PORTRAIT}, interne ${INNER_PORTRAIT} px. Un seul emplacement iPhone Duo, jusqu’à 10 captures par langue.`,
  },
  en: {
    title: "iPhone Duo screenshot sizes: 1398×2034 & 2007×2853",
    description: `App Store Connect screenshot sizes: outer ${OUTER_PORTRAIT}, inner ${INNER_PORTRAIT} px. One iPhone Duo slot, up to 10 screenshots per locale.`,
  },
};
