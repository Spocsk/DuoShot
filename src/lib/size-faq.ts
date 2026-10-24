import { MAX_IMAGES, type Locale } from "./specs";
import type { FaqItem } from "./screenshot-copy";
import type { ScreenshotSize } from "./screenshot-pages";

/*
 * Visible FAQ and FAQPage JSON-LD for each screen-size page. Answers are grounded in the same
 * repo facts as SPECS_FAQ (screenshot-copy.ts): App Store Connect accepts up to MAX_IMAGES per
 * device size, the Duo sizes become required from April 2027 for iOS 27.1 SDK apps, and the inner
 * panel's native 1878 × 2670 differs from the 2007 × 2853 App Store screenshot size. The copy never
 * claims both Duo sizes are required — DuoShot lets users pick outer only, inner only, or a mix.
 */

const COUNT = {
  fr: `App Store Connect accepte jusqu’à ${MAX_IMAGES} captures par taille d’appareil.`,
  en: `App Store Connect accepts up to ${MAX_IMAGES} screenshots per device size.`,
} as const;

const DUO_REQUIRED = {
  fr: "Les captures iPhone Duo seront exigées à partir d’avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur. DuoShot vous laisse choisir l’écran externe uniquement, l’écran interne uniquement ou un mix.",
  en: "iPhone Duo screenshots will be required from April 2027 for apps built with the iOS 27.1 SDK or later. DuoShot lets you choose the outer display only, the inner display only, or a mix.",
} as const;

const SIZE_FAQ: Record<ScreenshotSize, Record<Locale, FaqItem[]>> = {
  "1398x2034": {
    fr: [
      { q: "1398x2034 correspond-il à l’écran externe ou interne de l’iPhone Duo ?", a: "C’est l’écran externe de l’iPhone Duo (fermé). Utilisez 1398 × 2034 pixels en portrait, ou 2034 × 1398 en paysage, pour App Store Connect." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: `${COUNT.fr} Dans DuoShot, choisissez l’écran externe uniquement, l’écran interne uniquement ou un mix.` },
      { q: "Les captures iPhone Duo sont-elles obligatoires ?", a: DUO_REQUIRED.fr },
    ],
    en: [
      { q: "Is 1398x2034 the iPhone Duo outer or inner display?", a: "It is the iPhone Duo outer display (closed). Use 1398 × 2034 pixels in portrait, or 2034 × 1398 in landscape, for App Store Connect." },
      { q: "How many screenshots can I upload at this size?", a: `${COUNT.en} In DuoShot, choose the outer display only, the inner display only, or a mix.` },
      { q: "Are iPhone Duo screenshots required?", a: DUO_REQUIRED.en },
    ],
  },
  "2007x2853": {
    fr: [
      { q: "2007x2853 correspond-il à l’écran externe ou interne de l’iPhone Duo ?", a: "C’est l’écran interne de l’iPhone Duo (ouvert). Utilisez 2007 × 2853 pixels en portrait, ou 2853 × 2007 en paysage, pour App Store Connect." },
      { q: "Pourquoi 2007 × 2853 est-il plus grand que la dalle interne de 1878 × 2670 ?", a: "La dalle interne affiche 1878 × 2670 pixels, mais la taille de capture App Store Connect en portrait est de 2007 × 2853 pixels, plus grande que la dalle. Exportez vos fichiers à la taille App Store Connect, pas à la résolution native de la dalle." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: `${COUNT.fr} Dans DuoShot, choisissez l’écran externe uniquement, l’écran interne uniquement ou un mix.` },
      { q: "Les captures iPhone Duo sont-elles obligatoires ?", a: DUO_REQUIRED.fr },
    ],
    en: [
      { q: "Is 2007x2853 the iPhone Duo outer or inner display?", a: "It is the iPhone Duo inner display (open). Use 2007 × 2853 pixels in portrait, or 2853 × 2007 in landscape, for App Store Connect." },
      { q: "Why is 2007 × 2853 larger than the 1878 × 2670 inner panel?", a: "The physical inner panel is 1878 × 2670 pixels, but the portrait App Store Connect screenshot size is 2007 × 2853 pixels, larger than the panel. Export your files at the App Store Connect size, not the panel's native resolution." },
      { q: "How many screenshots can I upload at this size?", a: `${COUNT.en} In DuoShot, choose the outer display only, the inner display only, or a mix.` },
      { q: "Are iPhone Duo screenshots required?", a: DUO_REQUIRED.en },
    ],
  },
  "1206x2622": {
    fr: [
      { q: "Cette taille est-elle requise pour App Store Connect ?", a: "Oui. iPhone Dynamic Island (écran moyen, 6,3″) requis : 1206 × 2622 pixels en portrait ou 2622 × 1206 en paysage. App Store Connect accepte aussi 1179 × 2556 ou 2556 × 1179. DuoShot exporte en 1206 × 2622, inclus dans l’essai gratuit." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: COUNT.fr },
    ],
    en: [
      { q: "Is this size required for App Store Connect?", a: "Yes. iPhone with Dynamic Island (medium display, 6.3\") required: 1206 × 2622 pixels in portrait or 2622 × 1206 in landscape. App Store Connect also accepts 1179 × 2556 or 2556 × 1179. DuoShot exports 1206 × 2622, included in the free trial." },
      { q: "How many screenshots can I upload at this size?", a: COUNT.en },
    ],
  },
  "1320x2868": {
    fr: [
      { q: "La taille 6,9″ est-elle obligatoire ?", a: "Non, elle est optionnelle dans App Store Connect. DuoShot exporte le 1320 × 2868 (ou 2868 × 1320 en paysage) avec Pass, Indie et Studio ; l’iPhone Dynamic Island (écran moyen, 6,3″) requis reste inclus dans l’essai gratuit." },
      { q: "Quels autres formats 6,9″ Connect accepte-t-il ?", a: "App Store Connect accepte aussi 1290 × 2796 (ou 2796 × 1290) pour l’emplacement iPhone 6,9 pouces." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: COUNT.fr },
    ],
    en: [
      { q: "Is the 6.9″ size required?", a: "No, it is optional in App Store Connect. DuoShot exports 1320 × 2868 (or 2868 × 1320 in landscape) with Pass, Indie and Studio; the iPhone with Dynamic Island (medium display, 6.3\") required stays included in the free trial." },
      { q: "Which other 6.9″ formats does Connect accept?", a: "App Store Connect also accepts 1290 × 2796 (or 2796 × 1290) for the 6.9-inch iPhone slot." },
      { q: "How many screenshots can I upload at this size?", a: COUNT.en },
    ],
  },
};

export function sizeFaq(locale: Locale, size: ScreenshotSize): FaqItem[] {
  return SIZE_FAQ[size][locale];
}
