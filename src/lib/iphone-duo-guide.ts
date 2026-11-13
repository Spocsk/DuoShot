import type { Locale } from "./specs";
import { localizedPath, rejectionPath } from "./site";
import { SCREENSHOT_CHECKER_PATH } from "./screenshot-checker";

/*
 * Extra, iPhone-Duo-only sections for the /guides/screenshot-size/iphone-duo device page, rendered
 * by DevicePage when device.slug === "iphone-duo". Every fact is grounded in Apple's screenshot
 * specifications (the Duo outer/inner sizes, the still-required medium-display slot, the April 2027
 * deadline) plus DuoShot's own honest limits. Aspect ratios are COMPUTED from Apple's pixel sizes,
 * not published by Apple, and this is stated in the copy. The copy never says both Duo sizes are
 * required, and never claims DuoShot uploads to App Store Connect.
 */

export type DuoGuideTable = { columns: [string, string, string]; rows: [string, string, string][] };
export type DuoGuideLink = { label: string; href: string };

export type IphoneDuoGuideExtra = {
  separate: { heading: string; body: string };
  reuse: { heading: string; intro: string; table: DuoGuideTable; flatten: string };
  ratios: { heading: string; intro: string; note: string; rows: { size: string; ratio: string; label: string }[] };
  timeline: { heading: string; intro: string; quotes: { text: string; cite: string }[] };
  limits: { heading: string; items: string[] };
  links: { heading: string; items: DuoGuideLink[] };
};

/** Computed width ÷ height ratios, rounded to three decimals, shared by both locales. */
const RATIO_ROWS = [
  { size: "1398 × 2034", ratio: "0,687", label: { fr: "iPhone Duo — écran externe", en: "iPhone Duo — outer display" } },
  { size: "2007 × 2853", ratio: "0,703", label: { fr: "iPhone Duo — écran interne", en: "iPhone Duo — inner display" } },
  { size: "1206 × 2622", ratio: "0,460", label: { fr: "écran moyen (requis)", en: "medium display (required)" } },
  { size: "1179 × 2556", ratio: "0,461", label: { fr: "écran moyen (alternative)", en: "medium display (alternative)" } },
  { size: "1320 × 2868", ratio: "0,460", label: { fr: "grand écran 6,9″", en: "6.9″ large display" } },
] as const;

const APRIL_2027 = {
  fr: [
    { text: "Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.", cite: "Apple, Screenshot specifications" },
    { text: "Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.", cite: "Apple, actualité développeurs iPhone Duo, 5 octobre 2026" },
  ],
  en: [
    { text: "Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.", cite: "Apple, Screenshot specifications" },
    { text: "Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.", cite: "Apple, iPhone Duo developer news, October 5, 2026" },
  ],
} as const;

export function iphoneDuoGuideExtra(locale: Locale): IphoneDuoGuideExtra {
  const links: DuoGuideLink[] = locale === "fr"
    ? [
        { label: "Spécifications complètes", href: localizedPath(locale, "/specs") },
        { label: "1398 × 2034 (écran externe)", href: localizedPath(locale, "/1398x2034") },
        { label: "2007 × 2853 (écran interne)", href: localizedPath(locale, "/2007x2853") },
        { label: "1206 × 2622 (écran moyen requis)", href: localizedPath(locale, "/1206x2622") },
        { label: "1320 × 2868 (6,9″)", href: localizedPath(locale, "/1320x2868") },
        { label: "Vérifier une capture iPhone Duo", href: localizedPath(locale, SCREENSHOT_CHECKER_PATH) },
        { label: "Quoi vérifier avant la revue App Store", href: rejectionPath(locale) },
      ]
    : [
        { label: "Full specifications", href: localizedPath(locale, "/specs") },
        { label: "1398 × 2034 (outer display)", href: localizedPath(locale, "/1398x2034") },
        { label: "2007 × 2853 (inner display)", href: localizedPath(locale, "/2007x2853") },
        { label: "1206 × 2622 (required medium display)", href: localizedPath(locale, "/1206x2622") },
        { label: "1320 × 2868 (6.9″)", href: localizedPath(locale, "/1320x2868") },
        { label: "Check an iPhone Duo screenshot", href: localizedPath(locale, SCREENSHOT_CHECKER_PATH) },
        { label: "What to check before App Store review", href: rejectionPath(locale) },
      ];

  if (locale === "fr") {
    return {
      separate: {
        heading: "L’emplacement « écran moyen » requis reste distinct",
        body: "Les tailles iPhone Duo (1398 × 2034 externe et 2007 × 2853 interne) forment un groupe à part. Le groupe « iPhone with Dynamic Island (medium display) » — 1206 × 2622 ou 1179 × 2556 — reste requis par App Store Connect pour soumettre une app iPhone. Déposer des captures Duo ne remplit pas cet emplacement requis : les deux coexistent.",
      },
      reuse: {
        heading: "Puis-je réutiliser une capture existante ?",
        intro: "N’étirez pas une capture vers une taille Duo : l’étirement la déforme, car les proportions diffèrent. Recadrez seulement si le sujet tient encore dans le nouveau cadre ; sinon, refaites la capture à la taille Duo.",
        table: {
          columns: ["Capture de départ", "Action", "Pourquoi"],
          rows: [
            ["Déjà en 1398 × 2034 ou 2007 × 2853 (une taille Duo)", "Garder", "Elle correspond à la taille iPhone Duo ; déposez-la telle quelle."],
            ["Une capture iPhone 6,3″ (1206 × 2622) ou 6,9″ (1320 × 2868) dont le sujet tient dans le cadre Duo", "Recadrer", "Recadrez ou ajoutez des marges jusqu’à la taille Duo, sans étirer : le ratio n’est pas le même."],
            ["Une capture dont la mise en page ne survit pas à un recadrage (texte coupé, composition différente)", "Refaire", "Recapturez à la taille Duo ; n’agrandissez pas une image plus petite."],
          ],
        },
        flatten: "Aplatissez la transparence : App Store Connect refuse les PNG comportant un canal alpha, même si les pixels semblent opaques.",
      },
      ratios: {
        heading: "Ratios largeur ÷ hauteur (calculés)",
        intro: "Ces ratios aident à voir pourquoi une capture d’écran moyen (≈ 0,46) ne peut pas simplement être étirée vers une taille Duo (≈ 0,69–0,70).",
        note: "Ratios calculés par DuoShot à partir des tailles en pixels d’Apple ; Apple ne les publie pas.",
        rows: RATIO_ROWS.map((row) => ({ size: row.size, ratio: row.ratio, label: row.label.fr })),
      },
      timeline: {
        heading: "Calendrier : avril 2027",
        intro: "Apple formule l’échéance à deux endroits, différemment. Les deux citations ci-dessous sont reproduites telles quelles, sans être fusionnées :",
        quotes: [...APRIL_2027.fr],
      },
      limits: {
        heading: "Les limites de DuoShot, en toute transparence",
        items: [
          "DuoShot exporte un ZIP de fichiers image que vous déposez vous-même dans App Store Connect.",
          "DuoShot n’a pas testé le dépôt Duo dans App Store Connect, y compris via son connecteur automatique expérimental.",
          "Préparer les fichiers ne garantit pas l’approbation d’Apple.",
        ],
      },
      links: { heading: "Ressources iPhone Duo", items: links },
    };
  }
  return {
    separate: {
      heading: "The required “medium display” slot stays separate",
      body: "The iPhone Duo sizes (1398 × 2034 outer and 2007 × 2853 inner) are their own group. The “iPhone with Dynamic Island (medium display)” group — 1206 × 2622 or 1179 × 2556 — is still required by App Store Connect to submit an iPhone app. Submitting Duo screenshots does not fill that required slot: the two coexist.",
    },
    reuse: {
      heading: "Can I reuse an existing screenshot?",
      intro: "Don’t stretch a screenshot to a Duo size — stretching distorts it, because the proportions differ. Recrop only when the subject still fits the new frame; otherwise redo the screenshot at the Duo size.",
      table: {
        columns: ["Starting screenshot", "Action", "Why"],
        rows: [
          ["Already 1398 × 2034 or 2007 × 2853 (a Duo size)", "Keep", "It matches the iPhone Duo size; upload it as is."],
          ["A 6.3″ (1206 × 2622) or 6.9″ (1320 × 2868) iPhone shot whose subject fits the Duo frame", "Recrop", "Recrop or pad to the Duo size without stretching: the aspect ratio differs."],
          ["A shot whose layout can’t survive a crop (text cut off, different composition)", "Redo", "Recapture at the Duo size; don’t upscale a smaller image."],
        ],
      },
      flatten: "Flatten transparency: App Store Connect rejects PNGs with an alpha channel, even when the pixels look opaque.",
    },
    ratios: {
      heading: "Width ÷ height ratios (computed)",
      intro: "These ratios show why a medium-display shot (≈ 0.46) can’t simply be stretched into a Duo size (≈ 0.69–0.70).",
      note: "Ratios computed by DuoShot from Apple’s pixel sizes; Apple does not publish them.",
      rows: RATIO_ROWS.map((row) => ({ size: row.size, ratio: row.ratio.replace(",", "."), label: row.label.en })),
    },
    timeline: {
      heading: "April 2027 timeline",
      intro: "Apple words the deadline in two places, differently. Both quotes below are reproduced as-is, not merged:",
      quotes: [...APRIL_2027.en],
    },
    limits: {
      heading: "DuoShot’s limits, honestly",
      items: [
        "DuoShot exports a ZIP of image files that you upload yourself in App Store Connect.",
        "DuoShot has not tested the Duo upload in App Store Connect, including its experimental automatic connector.",
        "Preparing the files does not guarantee Apple approval.",
      ],
    },
    links: { heading: "iPhone Duo resources", items: links },
  };
}
