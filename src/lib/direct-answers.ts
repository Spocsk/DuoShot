import { APPLE_SCREENSHOT_SOURCE } from "./apple-screenshot-status";
import { INNER_LANDSCAPE, INNER_PORTRAIT, OUTER_LANDSCAPE, OUTER_PORTRAIT } from "./screenshot-copy";
import type { Locale } from "./specs";

export type DirectAnswerPage = "1398x2034" | "2007x2853" | "specs" | "rejection";

export function directAnswer(locale: Locale, page: DirectAnswerPage) {
  const answers: Record<Locale, Record<DirectAnswerPage, string>> = {
    fr: {
      "1398x2034": `App Store Connect accepte des captures de ${OUTER_PORTRAIT} pixels en portrait, ou ${OUTER_LANDSCAPE} en paysage, pour l’écran externe de l’iPhone Duo.`,
      "2007x2853": `App Store Connect accepte des captures de ${INNER_PORTRAIT} pixels en portrait, ou ${INNER_LANDSCAPE} en paysage, pour l’écran interne de l’iPhone Duo.`,
      specs: `Pour l’iPhone Duo, App Store Connect accepte des captures de ${OUTER_PORTRAIT} pixels pour l’écran externe et de ${INNER_PORTRAIT} pixels pour l’écran interne (${OUTER_LANDSCAPE} et ${INNER_LANDSCAPE} en paysage), jusqu’à 10 par taille d’appareil.`,
      rejection: `App Store Connect accepte les captures iPhone Duo de ${OUTER_PORTRAIT} ou ${INNER_PORTRAIT} pixels (${OUTER_LANDSCAPE} ou ${INNER_LANDSCAPE} en paysage), en PNG ou JPEG sans canal alpha, jusqu’à 10 par taille d’appareil : vérifiez ces points avant le dépôt.`,
    },
    en: {
      "1398x2034": `App Store Connect accepts ${OUTER_PORTRAIT} pixel screenshots in portrait, or ${OUTER_LANDSCAPE} in landscape, for the iPhone Duo outer display.`,
      "2007x2853": `App Store Connect accepts ${INNER_PORTRAIT} pixel screenshots in portrait, or ${INNER_LANDSCAPE} in landscape, for the iPhone Duo inner display.`,
      specs: `For iPhone Duo, App Store Connect accepts ${OUTER_PORTRAIT} pixel screenshots for the outer display and ${INNER_PORTRAIT} pixel screenshots for the inner display (${OUTER_LANDSCAPE} and ${INNER_LANDSCAPE} in landscape), up to 10 per device size.`,
      rejection: `App Store Connect accepts iPhone Duo screenshots at ${OUTER_PORTRAIT} or ${INNER_PORTRAIT} pixels (${OUTER_LANDSCAPE} or ${INNER_LANDSCAPE} in landscape), as PNG or JPEG with no alpha channel, up to 10 per device size: check these points before uploading.`,
    },
  };
  return {
    text: answers[locale][page],
    sourceUrl: APPLE_SCREENSHOT_SOURCE,
    sourceLabel: locale === "fr" ? "Source : spécifications des captures d’écran d’Apple" : "Source: Apple screenshot specifications",
  };
}
