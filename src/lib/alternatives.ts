import { FREE_EXPORTS, PASS30, PLANS } from "./plans";
import type { Locale } from "./specs";
import type { FaqItem } from "./screenshot-copy";

/**
 * "Alternative to <X>" landing pages. Competitor facts come ONLY from
 * docs/sources/competitors-2026-11-03.md; anything the official page did not state
 * is shown as "Non indiqué sur leur site" / "Not stated on their site" (never "No").
 * DuoShot cells restate facts already published in the repo (plans.ts, comparisons.ts).
 * Each entry carries its source URLs and the checked date, shown on the page.
 */

export type AltLocalized = { fr: string; en: string };

type AlternativeRow = { competitor: AltLocalized; duoshot: AltLocalized };

export type Alternative = {
  slug: string;
  name: string;
  url: string;
  sources: readonly string[];
  /** ISO date the competitor facts were checked. */
  checked: string;
  /** Matching "DuoShot vs <competitor>" slug in comparisons.ts, when one exists. */
  comparisonSlug?: string;
  rows: {
    price: AlternativeRow;
    watermark: AlternativeRow;
    duo: AlternativeRow;
    multiLanguage: AlternativeRow;
  };
  strengths: { fr: readonly string[]; en: readonly string[] };
  whenToChoose: AltLocalized;
  faq: readonly { q: AltLocalized; a: AltLocalized }[];
};

const NOT_STATED: AltLocalized = {
  fr: "Non indiqué sur leur site",
  en: "Not stated on their site",
};

/** DuoShot facts, read from the repo. Shown in the DuoShot column of every table. */
const DUOSHOT = {
  price: {
    fr: `Essai gratuit : ${FREE_EXPORTS} ZIP HD. Pass : ${PASS30.priceEur} € (${PASS30.days} j). Indie : ${PLANS.indie.monthlyEur} €/mois ou ${PLANS.indie.yearlyEur} €/an. Studio : ${PLANS.studio.monthlyEur} €/mois ou ${PLANS.studio.yearlyEur} €/an. TVA non applicable (art. 293 B du CGI).`,
    en: `Free trial: ${FREE_EXPORTS} HD ZIPs. Pass: €${PASS30.priceEur} (${PASS30.days} days). Indie: €${PLANS.indie.monthlyEur}/month or €${PLANS.indie.yearlyEur}/year. Studio: €${PLANS.studio.monthlyEur}/month or €${PLANS.studio.yearlyEur}/year. VAT not applicable, art. 293 B of the French CGI.`,
  },
  // Not advertised in the repo's marketing copy, so we do not claim either way.
  watermark: { fr: "Non indiqué", en: "Not stated" },
  duo: {
    fr: "Oui : écran externe 1398 × 2034, écran interne 2007 × 2853",
    en: "Yes: outer display 1398 × 2034, inner display 2007 × 2853",
  },
  multiLanguage: { fr: "Non indiqué", en: "Not stated" },
} satisfies Record<keyof Alternative["rows"], AltLocalized>;

const duoRow = (competitor: AltLocalized): AlternativeRow => ({ competitor, duoshot: DUOSHOT.duo });

export const ALTERNATIVES: readonly Alternative[] = [
  {
    slug: "appscreens",
    name: "AppScreens",
    url: "https://appscreens.com/",
    sources: ["https://appscreens.com/", "https://appscreens.com/pricing"],
    checked: "2026-11-03",
    comparisonSlug: "duoshot-vs-appscreens",
    rows: {
      price: {
        competitor: {
          fr: "Gratuit $0 ; Pro $8.25/mois facturé à l’année $99.00 ; Scale $15.00/mois facturé à l’année $180.00 (abonnements, pas de paiement unique)",
          en: "Free $0; Pro $8.25/month billed annually at $99.00; Scale $15.00/month billed annually at $180.00 (subscriptions, no one-time plan)",
        },
        duoshot: DUOSHOT.price,
      },
      watermark: {
        competitor: {
          fr: "Aperçu des fonctionnalités Pro avec filigrane sur l’offre gratuite",
          en: "Pro features previewed with watermarks on the free plan",
        },
        duoshot: DUOSHOT.watermark,
      },
      duo: duoRow({
        fr: "Taille « iPhone Duo » listée sur la page de tarifs, abonnement requis",
        en: "“iPhone Duo” size listed on the pricing page, subscription required",
      }),
      multiLanguage: {
        competitor: {
          fr: "Traduction et localisation en 80+ langues (offre Pro) ; 0 sur l’offre gratuite",
          en: "Translate & localize into 80+ languages (Pro); 0 on the free plan",
        },
        duoshot: DUOSHOT.multiLanguage,
      },
    },
    strengths: {
      fr: [
        "Toutes les tailles iOS et Android",
        "Traduction et localisation en 80+ langues (Pro)",
        "Dépôt direct sur l’App Store et Google Play (Pro)",
        "50 projets enregistrés (Pro)",
      ],
      en: [
        "All iOS & Android sizes",
        "Translate & localize into 80+ languages (Pro)",
        "Direct upload to App Store & Google Play (Pro)",
        "50 saved projects (Pro)",
      ],
    },
    whenToChoose: {
      fr: "Choisissez AppScreens si vous préparez des captures iOS et Android, avec traduction en 80+ langues et dépôt direct sur l’App Store et Google Play depuis un seul abonnement. DuoShot se concentre sur l’iPhone Duo et les tailles iOS, et vous livre un ZIP que vous déposez vous-même.",
      en: "Choose AppScreens if you prepare both iOS and Android screenshots, with translation into 80+ languages and direct upload to the App Store and Google Play from one subscription. DuoShot focuses on iPhone Duo and iOS sizes, and hands you a ZIP that you upload yourself.",
    },
    faq: [
      {
        q: { fr: "DuoShot est-il une bonne alternative à AppScreens ?", en: "Is DuoShot a good AppScreens alternative?" },
        a: {
          fr: "DuoShot est une alternative à AppScreens quand votre cible est l’iPhone Duo : vous importez vos vraies captures, les cadrez aux formats App Store d’Apple (écran externe 1398 × 2034, écran interne 2007 × 2853) et exportez un ZIP de PNG/JPEG opaque. Le dépôt dans App Store Connect reste manuel et n’a pas été testé par DuoShot.",
          en: "DuoShot is an AppScreens alternative when your target is iPhone Duo: you import your real screenshots, frame them to Apple’s App Store sizes (outer 1398 × 2034, inner 2007 × 2853) and export a ZIP of opaque PNG/JPEG files. App Store Connect upload stays manual and has not been tested by DuoShot.",
        },
      },
      {
        q: { fr: "Combien coûte AppScreens ?", en: "How much does AppScreens cost?" },
        a: {
          fr: "D’après leur site le 3 novembre 2026, AppScreens propose une offre gratuite à $0, une offre Pro à $8.25/mois (facturée $99.00 à l’année) et une offre Scale à $15.00/mois (facturée $180.00 à l’année). DuoShot est distinct : essai gratuit, Pass à 19 €, Indie à 12 €/mois et Studio à 49 €/mois.",
          en: "Per their site on November 3, 2026, AppScreens offers a free plan at $0, a Pro plan at $8.25/month (billed $99.00 yearly) and a Scale plan at $15.00/month (billed $180.00 yearly). DuoShot is separate: a free trial, a €19 Pass, Indie at €12/month and Studio at €49/month.",
        },
      },
      {
        q: { fr: "AppScreens gère-t-il les captures iPhone Duo ?", en: "Does AppScreens handle iPhone Duo screenshots?" },
        a: {
          fr: "La page de tarifs d’AppScreens liste une taille « iPhone Duo », avec abonnement requis (vérifié le 3 novembre 2026). DuoShot est spécialisé sur l’iPhone Duo et exporte directement l’écran externe (1398 × 2034) et l’écran interne (2007 × 2853).",
          en: "The AppScreens pricing page lists an “iPhone Duo” size, with a subscription required (checked November 3, 2026). DuoShot focuses on iPhone Duo and exports the outer display (1398 × 2034) and inner display (2007 × 2853) directly.",
        },
      },
    ],
  },
  {
    slug: "applaunchpad",
    name: "AppLaunchpad",
    url: "https://theapplaunchpad.com/",
    sources: ["https://theapplaunchpad.com/"],
    checked: "2026-11-03",
    comparisonSlug: "duoshot-vs-applaunchpad",
    rows: {
      price: {
        competitor: {
          fr: "Non indiqué sur leur site (page de tarifs non récupérée)",
          en: "Not stated on their site (pricing page not fetched)",
        },
        duoshot: DUOSHOT.price,
      },
      watermark: { competitor: NOT_STATED, duoshot: DUOSHOT.watermark },
      duo: duoRow({
        fr: "Non mentionné sur leur page d’accueil",
        en: "Not mentioned on their homepage",
      }),
      multiLanguage: {
        competitor: {
          fr: "Localisation vers différentes langues et régions",
          en: "Localization to different languages and regions",
        },
        duoshot: DUOSHOT.multiLanguage,
      },
    },
    strengths: {
      fr: [
        "Plus de 1 000 modèles prédéfinis",
        "Cadres d’appareils iOS et Android",
        "Redimensionnement automatique vers toutes les tailles requises",
        "Localisation vers différentes langues et régions",
      ],
      en: [
        "1,000+ pre-built templates",
        "iOS and Android device frames",
        "Automatic scaling to all required sizes",
        "Localization to different languages and regions",
      ],
    },
    whenToChoose: {
      fr: "Choisissez AppLaunchpad si vous voulez une large bibliothèque de modèles (plus de 1 000) et le redimensionnement automatique vers les tailles iOS et Android. Vérifiez ses tarifs sur son site : nous n’avons pas pu récupérer sa page de prix. DuoShot se concentre sur l’iPhone Duo et exporte un ZIP.",
      en: "Choose AppLaunchpad if you want a large template library (1,000+) and automatic resizing across iOS and Android sizes. Check its pricing on their site: we could not fetch their pricing page. DuoShot focuses on iPhone Duo and exports a ZIP.",
    },
    faq: [
      {
        q: { fr: "DuoShot est-il une bonne alternative à AppLaunchpad ?", en: "Is DuoShot a good AppLaunchpad alternative?" },
        a: {
          fr: "DuoShot est une alternative à AppLaunchpad quand votre cible est l’iPhone Duo : vous importez vos vraies captures, les cadrez aux formats App Store d’Apple (écran externe 1398 × 2034, écran interne 2007 × 2853) et exportez un ZIP de PNG/JPEG opaque. Le dépôt dans App Store Connect reste manuel et n’a pas été testé par DuoShot.",
          en: "DuoShot is an AppLaunchpad alternative when your target is iPhone Duo: you import your real screenshots, frame them to Apple’s App Store sizes (outer 1398 × 2034, inner 2007 × 2853) and export a ZIP of opaque PNG/JPEG files. App Store Connect upload stays manual and has not been tested by DuoShot.",
        },
      },
      {
        q: { fr: "AppLaunchpad est-il gratuit ?", en: "Is AppLaunchpad free?" },
        a: {
          fr: "Leur page de tarifs n’a pas pu être récupérée le 3 novembre 2026 ; nous n’indiquons donc pas de prix pour AppLaunchpad. Vérifiez les tarifs sur leur site. DuoShot propose un essai gratuit, un Pass à 19 €, Indie à 12 €/mois et Studio à 49 €/mois.",
          en: "Their pricing page could not be fetched on November 3, 2026, so we do not state a price for AppLaunchpad. Check pricing on their site. DuoShot offers a free trial, a €19 Pass, Indie at €12/month and Studio at €49/month.",
        },
      },
      {
        q: { fr: "AppLaunchpad gère-t-il les captures iPhone Duo ?", en: "Does AppLaunchpad handle iPhone Duo screenshots?" },
        a: {
          fr: "L’iPhone Duo n’est pas mentionné sur leur page d’accueil (vérifié le 3 novembre 2026). DuoShot est spécialisé sur l’iPhone Duo : écran externe 1398 × 2034 et écran interne 2007 × 2853.",
          en: "iPhone Duo is not mentioned on their homepage (checked November 3, 2026). DuoShot focuses on iPhone Duo: outer display 1398 × 2034 and inner display 2007 × 2853.",
        },
      },
    ],
  },
  {
    slug: "screenshots-pro",
    name: "Screenshots.pro",
    url: "https://screenshots.pro/",
    sources: ["https://screenshots.pro/", "https://screenshots.pro/pricing"],
    checked: "2026-11-03",
    comparisonSlug: "duoshot-vs-screenshots-pro",
    rows: {
      price: {
        competitor: {
          fr: "Basic $0 ; Standard $19/mois ; Extended $49/mois ; facturation annuelle disponible",
          en: "Basic $0; Standard $19/month; Extended $49/month; annual billing available",
        },
        duoshot: DUOSHOT.price,
      },
      watermark: { competitor: NOT_STATED, duoshot: DUOSHOT.watermark },
      duo: duoRow({
        fr: "Non mentionné sur leur site",
        en: "Not mentioned on their site",
      }),
      multiLanguage: {
        competitor: {
          fr: "Traduction automatique vers les langues des stores (offre Standard)",
          en: "Automatic translation to App Store/Google Play languages (Standard plan)",
        },
        duoshot: DUOSHOT.multiLanguage,
      },
    },
    strengths: {
      fr: [
        "23 appareils au pixel près",
        "Angles 3D (Standard)",
        "Traduction automatique des captures (Standard)",
        "Accès API (Extended)",
        "Utilisable sans compte",
      ],
      en: [
        "23 pixel-perfect devices",
        "3D angles (Standard)",
        "Automatic screenshot translation (Standard)",
        "API access (Extended)",
        "Usable without an account",
      ],
    },
    whenToChoose: {
      fr: "Choisissez Screenshots.pro si vous voulez des cadres d’appareils panoramiques avec angles 3D, une API pour vos pipelines CI/CD et une offre gratuite couvrant tous les appareils. L’iPhone Duo n’est pas mentionné sur leur site ; DuoShot est dédié à ces deux écrans et exporte un ZIP.",
      en: "Choose Screenshots.pro if you want panoramic device frames with 3D angles, an API for your CI/CD pipelines and a free tier covering all devices. iPhone Duo is not mentioned on their site; DuoShot is dedicated to both Duo displays and exports a ZIP.",
    },
    faq: [
      {
        q: { fr: "DuoShot est-il une bonne alternative à Screenshots.pro ?", en: "Is DuoShot a good Screenshots.pro alternative?" },
        a: {
          fr: "DuoShot est une alternative à Screenshots.pro quand votre cible est l’iPhone Duo : vous importez vos vraies captures, les cadrez aux formats App Store d’Apple (écran externe 1398 × 2034, écran interne 2007 × 2853) et exportez un ZIP de PNG/JPEG opaque. Le dépôt dans App Store Connect reste manuel et n’a pas été testé par DuoShot.",
          en: "DuoShot is a Screenshots.pro alternative when your target is iPhone Duo: you import your real screenshots, frame them to Apple’s App Store sizes (outer 1398 × 2034, inner 2007 × 2853) and export a ZIP of opaque PNG/JPEG files. App Store Connect upload stays manual and has not been tested by DuoShot.",
        },
      },
      {
        q: { fr: "Combien coûte Screenshots.pro ?", en: "How much does Screenshots.pro cost?" },
        a: {
          fr: "D’après leur site le 3 novembre 2026, Screenshots.pro propose une offre Basic à $0, une offre Standard à $19/mois et une offre Extended à $49/mois, avec facturation annuelle disponible. DuoShot est distinct : essai gratuit, Pass à 19 €, Indie à 12 €/mois et Studio à 49 €/mois.",
          en: "Per their site on November 3, 2026, Screenshots.pro offers a Basic plan at $0, a Standard plan at $19/month and an Extended plan at $49/month, with annual billing available. DuoShot is separate: a free trial, a €19 Pass, Indie at €12/month and Studio at €49/month.",
        },
      },
      {
        q: { fr: "Screenshots.pro gère-t-il les captures iPhone Duo ?", en: "Does Screenshots.pro handle iPhone Duo screenshots?" },
        a: {
          fr: "L’iPhone Duo n’est pas mentionné sur leur site (vérifié le 3 novembre 2026). DuoShot est spécialisé sur l’iPhone Duo : écran externe 1398 × 2034 et écran interne 2007 × 2853.",
          en: "iPhone Duo is not mentioned on their site (checked November 3, 2026). DuoShot focuses on iPhone Duo: outer display 1398 × 2034 and inner display 2007 × 2853.",
        },
      },
    ],
  },
  {
    slug: "appmockup",
    name: "AppMockUp",
    url: "https://app-mockup.com/",
    sources: ["https://app-mockup.com/"],
    checked: "2026-11-03",
    comparisonSlug: "duoshot-vs-appmockup",
    rows: {
      price: {
        competitor: {
          fr: "Gratuit selon leur site (aucune offre payante indiquée)",
          en: "Free per their site (no paid plans stated)",
        },
        duoshot: DUOSHOT.price,
      },
      watermark: { competitor: NOT_STATED, duoshot: DUOSHOT.watermark },
      duo: duoRow(NOT_STATED),
      multiLanguage: { competitor: NOT_STATED, duoshot: DUOSHOT.multiLanguage },
    },
    strengths: {
      fr: [
        "Aucun compte requis",
        "Modèles App Store et Google Play",
        "Cadres d’appareils réalistes ou « clay »",
        "Fonds panoramiques",
      ],
      en: [
        "No account required",
        "App Store & Google Play templates",
        "Clay or real device frames",
        "Panoramic backgrounds",
      ],
    },
    whenToChoose: {
      fr: "Choisissez AppMockUp si vous voulez un éditeur gratuit, sans compte, avec des cadres d’appareils et des fonds panoramiques pour l’App Store et Google Play. DuoShot est dédié à l’iPhone Duo, vérifie vos dimensions et exporte un ZIP.",
      en: "Choose AppMockUp if you want a free, no-account designer with device frames and panoramic backgrounds for the App Store and Google Play. DuoShot is dedicated to iPhone Duo, checks your dimensions and exports a ZIP.",
    },
    faq: [
      {
        q: { fr: "DuoShot est-il une bonne alternative à AppMockUp ?", en: "Is DuoShot a good AppMockUp alternative?" },
        a: {
          fr: "DuoShot est une alternative à AppMockUp quand votre cible est l’iPhone Duo : vous importez vos vraies captures, les cadrez aux formats App Store d’Apple (écran externe 1398 × 2034, écran interne 2007 × 2853) et exportez un ZIP de PNG/JPEG opaque. Le dépôt dans App Store Connect reste manuel et n’a pas été testé par DuoShot.",
          en: "DuoShot is an AppMockUp alternative when your target is iPhone Duo: you import your real screenshots, frame them to Apple’s App Store sizes (outer 1398 × 2034, inner 2007 × 2853) and export a ZIP of opaque PNG/JPEG files. App Store Connect upload stays manual and has not been tested by DuoShot.",
        },
      },
      {
        q: { fr: "AppMockUp est-il gratuit ?", en: "Is AppMockUp free?" },
        a: {
          fr: "AppMockUp se présente comme gratuit et sans compte sur leur site ; aucune offre payante n’y est indiquée (vérifié le 3 novembre 2026). DuoShot propose un essai gratuit puis des offres payantes : Pass à 19 €, Indie à 12 €/mois et Studio à 49 €/mois.",
          en: "AppMockUp presents itself as free and no-account on their site; no paid plans are stated there (checked November 3, 2026). DuoShot offers a free trial, then paid plans: a €19 Pass, Indie at €12/month and Studio at €49/month.",
        },
      },
      {
        q: { fr: "AppMockUp gère-t-il les captures iPhone Duo ?", en: "Does AppMockUp handle iPhone Duo screenshots?" },
        a: {
          fr: "Le support de l’iPhone Duo n’est pas indiqué sur leur site (vérifié le 3 novembre 2026). DuoShot est spécialisé sur l’iPhone Duo : écran externe 1398 × 2034 et écran interne 2007 × 2853.",
          en: "iPhone Duo support is not stated on their site (checked November 3, 2026). DuoShot focuses on iPhone Duo: outer display 1398 × 2034 and inner display 2007 × 2853.",
        },
      },
    ],
  },
  {
    slug: "hotpot",
    name: "Hotpot",
    url: "https://hotpot.ai/app-store-screenshot-generator",
    sources: ["https://hotpot.ai/app-store-screenshot-generator", "https://hotpot.ai/pricing"],
    checked: "2026-11-03",
    rows: {
      price: {
        competitor: {
          fr: "Modèles de captures App Store gratuits à éditer et télécharger",
          en: "App Store screenshot templates free to edit and download",
        },
        duoshot: DUOSHOT.price,
      },
      watermark: { competitor: NOT_STATED, duoshot: DUOSHOT.watermark },
      duo: duoRow(NOT_STATED),
      multiLanguage: { competitor: NOT_STATED, duoshot: DUOSHOT.multiLanguage },
    },
    strengths: {
      fr: [
        "Modèles iPhone 17 et iPhone 18 éditables",
        "Modèles Pro Max en 1320 × 2868 px",
        "Panoramas de cinq panneaux exportés en ZIP",
        "Téléchargement en JPEG",
      ],
      en: [
        "Editable iPhone 17 and iPhone 18 templates",
        "Pro Max templates at 1320 × 2868 px",
        "Five-panel panoramas exported as a ZIP",
        "Download as JPEG",
      ],
    },
    whenToChoose: {
      fr: "Choisissez Hotpot si vous voulez des modèles de captures App Store gratuits et éditables pour les iPhone récents (dont le Pro Max en 1320 × 2868 px) et des panoramas de cinq panneaux exportés en ZIP. Hotpot n’est pas affilié à Apple. DuoShot est dédié à l’iPhone Duo et exporte un ZIP vérifié.",
      en: "Choose Hotpot if you want free, editable App Store screenshot templates for recent iPhones (including Pro Max at 1320 × 2868 px) and five-panel panoramas exported as a ZIP. Hotpot is not affiliated with Apple. DuoShot is dedicated to iPhone Duo and exports a checked ZIP.",
    },
    faq: [
      {
        q: { fr: "DuoShot est-il une bonne alternative à Hotpot ?", en: "Is DuoShot a good Hotpot alternative?" },
        a: {
          fr: "DuoShot est une alternative à Hotpot quand votre cible est l’iPhone Duo : vous importez vos vraies captures, les cadrez aux formats App Store d’Apple (écran externe 1398 × 2034, écran interne 2007 × 2853) et exportez un ZIP de PNG/JPEG opaque. Le dépôt dans App Store Connect reste manuel et n’a pas été testé par DuoShot.",
          en: "DuoShot is a Hotpot alternative when your target is iPhone Duo: you import your real screenshots, frame them to Apple’s App Store sizes (outer 1398 × 2034, inner 2007 × 2853) and export a ZIP of opaque PNG/JPEG files. App Store Connect upload stays manual and has not been tested by DuoShot.",
        },
      },
      {
        q: { fr: "Les modèles de Hotpot sont-ils gratuits ?", en: "Are Hotpot’s templates free?" },
        a: {
          fr: "Les modèles de captures App Store de Hotpot sont gratuits à éditer et télécharger. (vérifié le 3 novembre 2026). DuoShot propose un essai gratuit puis des offres payantes à partir de 12 €/mois.",
          en: "Hotpot’s App Store screenshot templates are free to edit and download. (checked November 3, 2026). DuoShot offers a free trial, then paid plans from €12/month.",
        },
      },
      {
        q: { fr: "Hotpot gère-t-il les captures iPhone Duo ?", en: "Does Hotpot handle iPhone Duo screenshots?" },
        a: {
          fr: "Le support de l’iPhone Duo n’est pas indiqué sur leur site ; Hotpot propose des modèles iPhone 17 et 18 et des modèles Pro Max en 1320 × 2868 px (vérifié le 3 novembre 2026). DuoShot est spécialisé sur l’iPhone Duo : écran externe 1398 × 2034 et écran interne 2007 × 2853.",
          en: "iPhone Duo support is not stated on their site; Hotpot offers iPhone 17 and 18 templates and Pro Max templates at 1320 × 2868 px (checked November 3, 2026). DuoShot focuses on iPhone Duo: outer display 1398 × 2034 and inner display 2007 × 2853.",
        },
      },
    ],
  },
];

export const ALTERNATIVE_SLUGS = ALTERNATIVES.map(({ slug }) => slug);

/** First-publication date of the "alternative to <X>" pages (first git commit of the batch). */
export const ALTERNATIVES_PUBLISHED_ON = "2026-11-03";

/** The hub listing every "alternative to <X>" page. */
export const ALTERNATIVES_BASE_PATH = "/alternatives";

/** Visible copy for the /alternatives hub, reused by the hub page and the /guides index registry. */
export const ALTERNATIVES_HUB_COPY = {
  fr: {
    h1: "DuoShot et ses alternatives pour les captures App Store",
    intro: "Comparez DuoShot aux générateurs de captures App Store. Chaque page met en regard les prix, le filigrane, la prise en charge de l’iPhone Duo et l’export multilingue, à partir de données publiques vérifiées.",
    title: "Alternatives : générateurs de captures App Store",
    description: "Comparez DuoShot aux alternatives pour vos captures App Store iPhone Duo : AppScreens, AppLaunchpad, Screenshots.pro, AppMockUp et Hotpot.",
    home: "Accueil",
    hub: "Alternatives",
  },
  en: {
    h1: "DuoShot and its alternatives for App Store screenshots",
    intro: "Compare DuoShot with App Store screenshot generators. Each page lines up price, watermark, iPhone Duo support and multi-language export, all from verified public data.",
    title: "App Store screenshot generator alternatives",
    description: "Compare DuoShot with alternatives for your iPhone Duo App Store screenshots: AppScreens, AppLaunchpad, Screenshots.pro, AppMockUp and Hotpot.",
    home: "Home",
    hub: "Alternatives",
  },
} as const;

export function alternativePath(slug: string): string {
  return `${ALTERNATIVES_BASE_PATH}/${slug}`;
}

const ROW_LABELS: Record<keyof Alternative["rows"], AltLocalized> = {
  price: { fr: "Prix", en: "Price" },
  watermark: { fr: "Filigrane", en: "Watermark" },
  duo: { fr: "iPhone Duo", en: "iPhone Duo" },
  multiLanguage: { fr: "Export multilingue", en: "Multi-language export" },
};

const ROW_ORDER = ["price", "watermark", "duo", "multiLanguage"] as const;

export type AlternativeView = {
  slug: string;
  name: string;
  url: string;
  sources: readonly string[];
  checkedOn: string;
  comparisonSlug?: string;
  title: string;
  description: string;
  dateModified: string;
  datePublished: string;
  answer: string;
  updatedLabel: string;
  tableCaption: string;
  columns: { label: string; duoshot: string; competitor: string };
  rows: readonly { label: string; duoshot: string; competitor: string }[];
  strengthsHeading: string;
  strengths: readonly string[];
  whenToChooseHeading: string;
  whenToChoose: string;
  faqHeading: string;
  faq: readonly FaqItem[];
  relatedHeading: string;
  breadcrumb: readonly { name: string; path: string }[];
};

function pick(value: AltLocalized, locale: Locale): string {
  return value[locale];
}

export function alternativePage(locale: Locale, slug: string): AlternativeView | null {
  const entry = ALTERNATIVES.find((item) => item.slug === slug);
  if (!entry) return null;
  const { name, url, sources, checked, comparisonSlug } = entry;
  const [year, month, day] = checked.split("-").map(Number);
  const checkedOn = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
  );
  // Kept short so that, with the layout's " · DuoShot" suffix, the rendered title stays ≤ 60 characters.
  // FR keeps "générateur"; EN keeps "generator"; the brand appears once, via the suffix.
  const title = locale === "fr"
    ? `Alternative à ${name} : générateur`
    : `${name} alternative: screenshot generator`;
  const description = locale === "fr"
    ? `${name} : alternative pour vos captures App Store iPhone Duo. Comparez prix, filigrane et langues, puis exportez un ZIP de PNG/JPEG avec DuoShot.`
    : `${name} alternative for iPhone Duo App Store screenshots. Compare price, watermark and languages, then export a ZIP of PNG/JPEG with DuoShot.`;
  const answer = locale === "fr"
    ? `DuoShot est une alternative à ${name} centrée sur l’iPhone Duo (le téléphone pliable d’Apple) : vous importez vos vraies captures, les cadrez aux formats App Store d’Apple et exportez un ZIP de PNG/JPEG opaque.`
    : `DuoShot is a ${name} alternative focused on iPhone Duo (Apple’s foldable iPhone): you import your real screenshots, frame them to Apple’s App Store sizes and export a ZIP of opaque PNG/JPEG files.`;
  return {
    slug,
    name,
    url,
    sources,
    checkedOn,
    comparisonSlug,
    title,
    description,
    dateModified: checked,
    datePublished: ALTERNATIVES_PUBLISHED_ON,
    answer,
    updatedLabel: locale === "fr" ? `Mis à jour le ${checkedOn}` : `Updated ${checkedOn}`,
    tableCaption: locale === "fr" ? `DuoShot et ${name}` : `DuoShot and ${name}`,
    columns: {
      label: locale === "fr" ? "Point de comparaison" : "Comparison point",
      duoshot: "DuoShot",
      competitor: name,
    },
    rows: ROW_ORDER.map((key) => ({
      label: pick(ROW_LABELS[key], locale),
      duoshot: pick(entry.rows[key].duoshot, locale),
      competitor: pick(entry.rows[key].competitor, locale),
    })),
    strengthsHeading: locale === "fr" ? `Points forts de ${name}` : `${name} strengths`,
    strengths: entry.strengths[locale],
    whenToChooseHeading: locale === "fr" ? `Quand choisir ${name} plutôt que DuoShot` : `When to choose ${name} instead of DuoShot`,
    whenToChoose: pick(entry.whenToChoose, locale),
    faqHeading: locale === "fr" ? "Questions fréquentes" : "Frequently asked questions",
    faq: entry.faq.map(({ q, a }) => ({ q: pick(q, locale), a: pick(a, locale) })),
    relatedHeading: locale === "fr" ? "À lire ensuite" : "Read next",
    breadcrumb: [
      { name: locale === "fr" ? "Accueil" : "Home", path: "/" },
      { name: locale === "fr" ? "Alternatives" : "Alternatives", path: ALTERNATIVES_BASE_PATH },
      { name: locale === "fr" ? `Alternative à ${name}` : `${name} alternative`, path: alternativePath(slug) },
    ],
  };
}
