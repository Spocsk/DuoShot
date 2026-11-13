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

/** The two Apple wordings of the April 2027 deadline, quoted verbatim and kept separate. */
const DUO_APRIL_2027 = {
  fr: {
    q: "Que dit exactement Apple sur l’échéance d’avril 2027 ?",
    a: "Apple la formule à deux endroits. Les spécifications des captures indiquent : « Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later. » L’actualité développeurs iPhone Duo du 5 octobre 2026 indique : « Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo. »",
  },
  en: {
    q: "What exactly does Apple say about the April 2027 deadline?",
    a: "Apple words it in two places. The screenshot specifications say: “Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.” The iPhone Duo developer news of October 5, 2026 says: “Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.”",
  },
} as const;

/** Duo screenshots sit alongside the still-required medium-display slot; they never replace it. */
const DUO_MEDIUM_SEPARATE = {
  fr: {
    q: "Les captures Duo remplacent-elles le groupe iPhone avec Dynamic Island (écran moyen) requis ?",
    a: "Non. Le groupe « iPhone with Dynamic Island (medium display) » — 1206 × 2622 ou 1179 × 2556 — est un groupe distinct qu’App Store Connect exige toujours pour soumettre une app iPhone. Les captures iPhone Duo s’ajoutent à ce groupe, elles ne le remplacent pas.",
  },
  en: {
    q: "Do Duo screenshots replace the required iPhone with Dynamic Island (medium display) group?",
    a: "No. The “iPhone with Dynamic Island (medium display)” group — 1206 × 2622 or 1179 × 2556 — is a separate group that App Store Connect still requires to submit an iPhone app. iPhone Duo screenshots are added alongside that group, not instead of it.",
  },
} as const;

const SIZE_FAQ: Record<ScreenshotSize, Record<Locale, FaqItem[]>> = {
  "1398x2034": {
    fr: [
      { q: "1398x2034 correspond-il à l’écran externe ou interne de l’iPhone Duo ?", a: "C’est l’écran externe de l’iPhone Duo (fermé). Utilisez 1398 × 2034 pixels en portrait, ou 2034 × 1398 en paysage, pour App Store Connect. L’écran interne utilise 2007 × 2853." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: `${COUNT.fr} Dans DuoShot, choisissez l’écran externe uniquement, l’écran interne uniquement ou un mix.` },
      { q: "Les captures iPhone Duo sont-elles obligatoires ?", a: DUO_REQUIRED.fr },
      DUO_APRIL_2027.fr,
      DUO_MEDIUM_SEPARATE.fr,
    ],
    en: [
      { q: "Is 1398x2034 the iPhone Duo outer or inner display?", a: "It is the iPhone Duo outer display (closed). Use 1398 × 2034 pixels in portrait, or 2034 × 1398 in landscape, for App Store Connect. The inner display uses 2007 × 2853." },
      { q: "How many screenshots can I upload at this size?", a: `${COUNT.en} In DuoShot, choose the outer display only, the inner display only, or a mix.` },
      { q: "Are iPhone Duo screenshots required?", a: DUO_REQUIRED.en },
      DUO_APRIL_2027.en,
      DUO_MEDIUM_SEPARATE.en,
    ],
  },
  "2007x2853": {
    fr: [
      { q: "2007x2853 correspond-il à l’écran externe ou interne de l’iPhone Duo ?", a: "C’est l’écran interne de l’iPhone Duo (ouvert). Utilisez 2007 × 2853 pixels en portrait, ou 2853 × 2007 en paysage, pour App Store Connect. L’écran externe utilise 1398 × 2034." },
      { q: "Pourquoi 2007 × 2853 est-il plus grand que la dalle interne de 1878 × 2670 ?", a: "La dalle interne affiche 1878 × 2670 pixels, mais la taille de capture App Store Connect en portrait est de 2007 × 2853 pixels, plus grande que la dalle. Exportez vos fichiers à la taille App Store Connect, pas à la résolution native de la dalle." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: `${COUNT.fr} Dans DuoShot, choisissez l’écran externe uniquement, l’écran interne uniquement ou un mix.` },
      { q: "Les captures iPhone Duo sont-elles obligatoires ?", a: DUO_REQUIRED.fr },
      DUO_APRIL_2027.fr,
      DUO_MEDIUM_SEPARATE.fr,
    ],
    en: [
      { q: "Is 2007x2853 the iPhone Duo outer or inner display?", a: "It is the iPhone Duo inner display (open). Use 2007 × 2853 pixels in portrait, or 2853 × 2007 in landscape, for App Store Connect. The outer display uses 1398 × 2034." },
      { q: "Why is 2007 × 2853 larger than the 1878 × 2670 inner panel?", a: "The physical inner panel is 1878 × 2670 pixels, but the portrait App Store Connect screenshot size is 2007 × 2853 pixels, larger than the panel. Export your files at the App Store Connect size, not the panel's native resolution." },
      { q: "How many screenshots can I upload at this size?", a: `${COUNT.en} In DuoShot, choose the outer display only, the inner display only, or a mix.` },
      { q: "Are iPhone Duo screenshots required?", a: DUO_REQUIRED.en },
      DUO_APRIL_2027.en,
      DUO_MEDIUM_SEPARATE.en,
    ],
  },
  "1206x2622": {
    fr: [
      { q: "Cette taille est-elle requise pour App Store Connect ?", a: "Oui. iPhone Dynamic Island (écran moyen, 6,3″) requis : 1206 × 2622 pixels en portrait ou 2622 × 1206 en paysage. App Store Connect accepte aussi 1179 × 2556 ou 2556 × 1179. DuoShot exporte en 1206 × 2622, inclus dans l’essai gratuit." },
      { q: "Combien de captures puis-je déposer à cette taille ?", a: COUNT.fr },
      { q: "1206 × 2622 ou 1179 × 2556 : laquelle utiliser ?", a: "Les deux sont acceptées dans le même groupe, « iPhone with Dynamic Island (medium display) ». La page d’Apple ne lie aucune des deux tailles à un modèle précis. Choisissez-en une et conservez-la pour toute la série. DuoShot exporte en 1206 × 2622." },
      { q: "2622 × 1206 est-elle la même taille ?", a: "Oui, c’est la version paysage de 1206 × 2622 et elle est acceptée dans le même groupe." },
      { q: "Ai-je encore besoin du 1320 × 2868 ?", a: "La liste « Required device sizes » d’Apple ne nomme que l’emplacement « medium display » pour l’iPhone. Si l’emplacement « large display » est vide, Apple utilise des captures mises à l’échelle depuis « iPhone with Face ID (large display) », et cette ligne indique « Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren’t provided ». Vérifiez App Store Connect pour votre app ; ajouter le 1320 × 2868 évite la question." },
      { q: "Puis-je réutiliser le 1206 × 2622 pour l’iPhone Duo ?", a: "Pas tel quel. L’iPhone Duo utilise 1398 × 2034 (écran externe) et 2007 × 2853 (écran interne), qui ont des proportions différentes : le fichier doit être recadré ou redessiné." },
    ],
    en: [
      { q: "Is this size required for App Store Connect?", a: "Yes. iPhone with Dynamic Island (medium display, 6.3\") required: 1206 × 2622 pixels in portrait or 2622 × 1206 in landscape. App Store Connect also accepts 1179 × 2556 or 2556 × 1179. DuoShot exports 1206 × 2622, included in the free trial." },
      { q: "How many screenshots can I upload at this size?", a: COUNT.en },
      { q: "1206 × 2622 or 1179 × 2556: which one should I use?", a: "Both are accepted in the same group, iPhone with Dynamic Island (medium display). Apple's page does not tie either size to a specific model. Pick one and keep it for the whole set. DuoShot exports 1206 × 2622." },
      { q: "Is 2622 × 1206 the same size?", a: "Yes, it is the landscape version of 1206 × 2622 and is accepted in the same group." },
      { q: "Do I still need 1320 × 2868?", a: "Apple's \"Required device sizes\" list only names the medium-display slot for iPhone. If the large-display slot is empty, Apple uses scaled screenshots from iPhone with Face ID (large display), and that row reads \"Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided\". Check App Store Connect for your app; adding 1320 × 2868 avoids the question." },
      { q: "Can I reuse 1206 × 2622 for iPhone Duo?", a: "Not as is. iPhone Duo uses 1398 × 2034 (outer) and 2007 × 2853 (inner), which have different proportions, so the file must be recropped or redesigned." },
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
