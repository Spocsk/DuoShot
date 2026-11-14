import type { Locale } from "./specs";
import { MAX_IMAGES } from "./specs";
import { INNER_PORTRAIT, OUTER_PORTRAIT, INNER_LANDSCAPE, OUTER_LANDSCAPE } from "./screenshot-copy";

/*
 * Per-locale enrichment rendered by SpecsPage under the Duo sizes table: a dated Apple source line,
 * the "made for iPhone Duo" badge quote, the scaling rule (why Duo has its own slot), and the common
 * iPhone Duo screenshot mistakes. Every pixel size reuses the Duo constants from screenshot-copy; every
 * Apple sentence is quoted verbatim from the Screenshot specifications page re-read on SPECS_SOURCE_CHECKED_ON.
 * The copy never says both Duo sizes are required, never says the App Store Connect upload is tested, and
 * never says Duo screenshots are scaled down from another slot. The two aspect-ratio figures in the
 * mistakes list are explicitly labelled as DuoShot's own calculation, not an Apple figure.
 */

export const SPECS_SOURCE_CHECKED_ON = "2026-11-14";

/** Format SPECS_SOURCE_CHECKED_ON per locale: EN "November 14, 2026", FR "14 novembre 2026". */
export function formatCheckedOn(locale: Locale, iso: string = SPECS_SOURCE_CHECKED_ON): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** One mistakes-list item; `link` (when present) points either at the rejection page or the #safe-area-fold section. */
export type MistakeItem = {
  before: string;
  link?: { label: string; target: "rejection" | "fold" };
  after?: string;
};

export type SpecsEnrichment = {
  /** Dated source line; `linkLabel` wraps a link to APPLE_SCREENSHOT_SOURCE. */
  source: { before: string; linkLabel: string; after: string };
  badge: string;
  scaling: string;
  mistakes: { heading: string; items: MistakeItem[] };
  /** Labels for the two "Related" links SpecsPage adds (hrefs computed there). */
  related: { deviceGuide: string; rejection: string };
};

export const SPECS_ENRICHMENT: Record<Locale, SpecsEnrichment> = {
  en: {
    source: {
      before: "Source: Apple, ",
      linkLabel: "Screenshot specifications",
      after: `, checked ${formatCheckedOn("en")}. Formats: .jpeg, .jpg or .png, 1 to ${MAX_IMAGES} screenshots per device size, no alpha channels or transparencies.`,
    },
    badge:
      "Submitting iPhone Duo screenshots adds a badge to your App Store product page showing the app is made for iPhone Duo. Apple: “When you submit iPhone Duo screenshots in App Store Connect, your App Store product page will display a badge to let people know your app is made for iPhone Duo.”",
    scaling:
      `Apple’s “Required device sizes” list names one iPhone slot: “At least one screenshot for iPhone with Dynamic Island (medium display).” (1206 × 2622 or 1179 × 2556 in portrait). The Face ID (large display) row also reads “Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided”. On scaling, Apple says: “If your app’s user interface is consistent across multiple device sizes and localizations, you only need to provide screenshots for the highest required resolution. App Store Connect automatically scales them down for smaller device sizes.” iPhone Duo has its own slot and its own sizes: ${OUTER_PORTRAIT} (outer display) and ${INNER_PORTRAIT} (inner display) in portrait.`,
    mistakes: {
      heading: "Common iPhone Duo screenshot mistakes",
      items: [
        { before: `Uploading the panel resolution (1878 × 2670, Apple tech specs) instead of the App Store Connect size ${INNER_PORTRAIT} for the inner display.` },
        {
          before: `Mixing orientations: landscape is ${OUTER_LANDSCAPE} (outer) and ${INNER_LANDSCAPE} (inner); use the dimensions that match the orientation of the set, otherwise Connect may report “The dimensions of one or more screenshots are wrong.” `,
          link: { label: "What to check before App Store review", target: "rejection" },
          after: ".",
        },
        { before: "Exporting a PNG with transparency: Apple says images can’t include alpha channels or transparencies; DuoShot exports opaque RGB." },
        { before: "Stretching a 1206 × 2622 iPhone screenshot to Duo dimensions: the aspect ratios differ (DuoShot’s calculation, not an Apple figure: 1206/2622 ≈ 0.46, 1398/2034 ≈ 0.69, 2007/2853 ≈ 0.70), so a resize distorts or letterboxes; compose a real Duo layout instead." },
        { before: "Thinking iPhone Duo replaces the required iPhone slot: Apple’s required list still names iPhone with Dynamic Island (medium display)." },
        {
          before: "Text or buttons across the fold on inner-display shots: keep key interface elements away from the fold. ",
          link: { label: "See the fold guidance", target: "fold" },
          after: ". The fold guide is a composition aid, not an Apple specification.",
        },
        { before: `More than ${MAX_IMAGES} screenshots per device size: Apple allows 1 to ${MAX_IMAGES}.` },
      ],
    },
    related: { deviceGuide: "iPhone Duo screenshot size guide", rejection: "What to check before App Store review" },
  },
  fr: {
    source: {
      before: "Source : Apple, ",
      linkLabel: "Screenshot specifications",
      after: `, vérifié le ${formatCheckedOn("fr")}. Formats : .jpeg, .jpg ou .png, 1 à ${MAX_IMAGES} captures par taille d’appareil, sans canal alpha ni transparence.`,
    },
    badge:
      "Déposer des captures iPhone Duo ajoute un badge à votre page produit App Store indiquant que l’app est conçue pour l’iPhone Duo. Apple : « When you submit iPhone Duo screenshots in App Store Connect, your App Store product page will display a badge to let people know your app is made for iPhone Duo. »",
    scaling:
      `La liste « Required device sizes » d’Apple ne nomme qu’un emplacement iPhone : « At least one screenshot for iPhone with Dynamic Island (medium display). » (1206 × 2622 ou 1179 × 2556 en portrait). La ligne Face ID (large display) indique aussi « Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided ». Sur la mise à l’échelle, Apple précise : « If your app’s user interface is consistent across multiple device sizes and localizations, you only need to provide screenshots for the highest required resolution. App Store Connect automatically scales them down for smaller device sizes. » L’iPhone Duo a son propre emplacement et ses propres tailles : ${OUTER_PORTRAIT} (écran externe) et ${INNER_PORTRAIT} (écran interne) en portrait.`,
    mistakes: {
      heading: "Erreurs fréquentes avec les captures iPhone Duo",
      items: [
        { before: `Déposer la résolution de la dalle (1878 × 2670, specs techniques Apple) au lieu de la taille App Store Connect ${INNER_PORTRAIT} pour l’écran interne.` },
        {
          before: `Mélanger les orientations : en paysage, c’est ${OUTER_LANDSCAPE} (écran externe) et ${INNER_LANDSCAPE} (écran interne) ; utilisez les dimensions correspondant à l’orientation de la série, sinon Connect peut signaler « The dimensions of one or more screenshots are wrong. » `,
          link: { label: "Quoi vérifier avant la revue App Store", target: "rejection" },
          after: ".",
        },
        { before: "Exporter un PNG avec transparence : Apple indique que les images ne peuvent pas comporter de canal alpha ni de transparence ; DuoShot exporte en RGB opaque." },
        { before: "Étirer une capture iPhone 1206 × 2622 aux dimensions Duo : les rapports d’affichage diffèrent (calcul DuoShot, et non un chiffre d’Apple : 1206/2622 ≈ 0,46, 1398/2034 ≈ 0,69, 2007/2853 ≈ 0,70), donc un redimensionnement déforme ou ajoute des bandes ; composez plutôt une vraie mise en page Duo." },
        { before: "Croire que l’iPhone Duo remplace l’emplacement iPhone requis : la liste requise d’Apple nomme toujours iPhone with Dynamic Island (medium display)." },
        {
          before: "Texte ou boutons à cheval sur la pliure des captures de l’écran interne : gardez les éléments clés hors de la pliure. ",
          link: { label: "Voir le repère de pliure", target: "fold" },
          after: ". Le guide de pliure est une aide à la composition, pas une spécification Apple.",
        },
        { before: `Plus de ${MAX_IMAGES} captures par taille d’appareil : Apple en autorise 1 à ${MAX_IMAGES}.` },
      ],
    },
    related: { deviceGuide: "Guide des tailles de captures iPhone Duo", rejection: "Quoi vérifier avant la revue App Store" },
  },
};

export function specsEnrichment(locale: Locale): SpecsEnrichment {
  return SPECS_ENRICHMENT[locale];
}

/** Flat list of every enrichment string for a locale, so copy scanners (e.g. no-optional-69) can check it. */
export function specsEnrichmentStrings(locale: Locale): string[] {
  const e = SPECS_ENRICHMENT[locale];
  const strings = [e.source.before, e.source.linkLabel, e.source.after, e.badge, e.scaling, e.mistakes.heading, e.related.deviceGuide, e.related.rejection];
  for (const item of e.mistakes.items) {
    strings.push(item.before);
    if (item.link) strings.push(item.link.label);
    if (item.after) strings.push(item.after);
  }
  return strings;
}
