import type { Metadata } from "next";
import type { Locale } from "./specs";

/*
 * Comparison page data. DuoShot cells restate facts already published elsewhere in the repo
 * (see comparisons.ts, specs.ts, plans.ts) and link to the matching DuoShot page. Each
 * competitor cell carries one public source URL for the exact claim, checked on 25/10/2026.
 * Cells that the official page did not state are kept as "Not stated"/"Non indiqué".
 */

/** Flip to true to index the page, list it in the sitemap and expose it in /llms.txt. */
export const COMPARE_PAGE_PUBLISHED = true;

/** Localized slugs: FR URLs stay unprefixed, EN URLs carry the /en prefix. */
export const COMPARE_ROUTE = { fr: "/comparatif", en: "/en/compare" } as const;

/** Sitemap priority once published, matching the other comparison routes. */
export const COMPARE_SITEMAP_PRIORITY = 0.7;

type Localized = { fr: string; en: string };

export const COMPARE_COMPETITORS = ["Shipper", "Screenies", "Rotato", "Framegrove"] as const;

export type CompareColumn = "platform" | "price" | "duoSizes" | "zipExport" | "ascUpload";

/** The row header holds the tool name; these five are the compared dimensions. */
export const COMPARE_COLUMNS: { key: CompareColumn; label: Localized }[] = [
  { key: "platform", label: { fr: "Plateforme", en: "Platform" } },
  { key: "price", label: { fr: "Prix", en: "Price" } },
  { key: "duoSizes", label: { fr: "Tailles iPhone Duo", en: "iPhone Duo size support" } },
  { key: "zipExport", label: { fr: "Export ZIP", en: "ZIP export" } },
  { key: "ascUpload", label: { fr: "Dépôt App Store Connect", en: "App Store Connect upload" } },
];

export type CompareCell = {
  value: Localized;
  /**
   * Public source backing the claim. Internal paths (starting with "/") link to the matching
   * DuoShot page; competitor cells carry the external URL where the claim was read.
   */
  source: string;
};

export type CompareRow = {
  id: string;
  name: string;
} & Record<CompareColumn, CompareCell>;

export const COMPARE_ROWS: CompareRow[] = [
  {
    id: "duoshot",
    name: "DuoShot",
    platform: {
      value: { fr: "Web", en: "Web" },
      source: "/specs",
    },
    price: {
      value: {
        fr: "Essai gratuit (2 ZIP HD) ; Pass 30 jours 19 € ; Indie 12 €/mois ou 120 €/an ; Studio 49 €/mois ou 490 €/an.",
        en: "Free trial (2 HD ZIPs); 30-day Pass €19; Indie €12/mo or €120/yr; Studio €49/mo or €490/yr.",
      },
      source: "/pricing",
    },
    duoSizes: {
      value: {
        fr: "Écran externe 1398 × 2034 et écran interne 2007 × 2853 pris en charge.",
        en: "Outer 1398 × 2034 and inner 2007 × 2853 displays supported.",
      },
      source: "/specs",
    },
    zipExport: {
      value: {
        fr: "Oui — ZIP de PNG/JPEG opaques, organisé par écran.",
        en: "Yes — ZIP of opaque PNG/JPEG, organized by screen.",
      },
      source: "/specs",
    },
    ascUpload: {
      value: {
        fr: "Dépôt manuel ; non testé par DuoShot.",
        en: "Manual upload; not tested by DuoShot.",
      },
      source: "/guides/iphone-duo-app-store-connect",
    },
  },
  {
    id: "shipper",
    name: "Shipper",
    platform: {
      value: { fr: "App Mac", en: "Mac app" },
      source: "https://shipper-screenshots.com/",
    },
    price: {
      value: {
        fr: "Gratuit ; PRO 25 $ en achat unique.",
        en: "Free; PRO $25 one-time.",
      },
      source: "https://shipper-screenshots.com/",
    },
    duoSizes: {
      value: { fr: "Non indiqué.", en: "Not stated." },
      source: "https://shipper-screenshots.com/",
    },
    zipExport: {
      value: {
        fr: "Non indiqué (export PNG indiqué).",
        en: "Not stated (PNG export stated).",
      },
      source: "https://shipper-screenshots.com/",
    },
    ascUpload: {
      value: { fr: "Oui, offre PRO.", en: "Yes, PRO." },
      source: "https://shipper-screenshots.com/",
    },
  },
  {
    id: "screenies",
    name: "Screenies",
    platform: {
      value: { fr: "Web", en: "Web" },
      source: "https://screenies.app/",
    },
    price: {
      value: {
        fr: "Packs de crédits en achat unique : 9 $ / 29 $ / 69 $ ; service clé en main 99 $.",
        en: "One-time credit packs: $9 / $29 / $69; done-for-you $99.",
      },
      source: "https://screenies.app/pricing",
    },
    duoSizes: {
      value: {
        fr: "Oui : 1398×2034 et 2007×2853.",
        en: "Yes: 1398×2034 and 2007×2853.",
      },
      source: "https://screenies.app/iphone-duo-screenshot-generator",
    },
    zipExport: {
      value: { fr: "Oui.", en: "Yes." },
      source: "https://screenies.app/",
    },
    ascUpload: {
      value: {
        fr: "Oui, avec un pack de crédits.",
        en: "Yes, with a credit pack.",
      },
      source: "https://screenies.app/upload-screenshots-to-app-store-connect",
    },
  },
  {
    id: "rotato",
    name: "Rotato",
    platform: {
      value: { fr: "App Mac, macOS 11+", en: "Mac app, macOS 11+" },
      source: "https://www.rotato.app/pricing",
    },
    price: {
      value: {
        fr: "Paiement unique : Basic 79 € / Standard 89 € / Premium 199 € (prix affichés depuis la France, le 25/10/2026).",
        en: "One-time: Basic 79 / Standard 89 / Premium 199 (EUR as shown from France, 25 Oct 2026).",
      },
      source: "https://www.rotato.app/pricing",
    },
    duoSizes: {
      value: { fr: "Non indiqué.", en: "Not stated." },
      source: "https://www.rotato.app/pricing",
    },
    zipExport: {
      value: { fr: "Non indiqué.", en: "Not stated." },
      source: "https://www.rotato.app/pricing",
    },
    ascUpload: {
      value: {
        fr: "Non indiqué (« App Store Images Export » listé).",
        en: "Not stated (“App Store Images Export” listed).",
      },
      source: "https://www.rotato.app/pricing",
    },
  },
  {
    id: "framegrove",
    name: "Framegrove",
    platform: {
      value: { fr: "Web, plus CLI/MCP", en: "Web, plus CLI/MCP" },
      source: "https://framegrove.bamstudio.dev/",
    },
    price: {
      value: {
        fr: "Gratuit, open source (MIT).",
        en: "Free, open source (MIT).",
      },
      source: "https://framegrove.bamstudio.dev/",
    },
    duoSizes: {
      value: {
        fr: "Oui : 1398×2034 et 2007×2853.",
        en: "Yes: 1398×2034 and 2007×2853.",
      },
      source: "https://framegrove.bamstudio.dev/iphone-duo/",
    },
    zipExport: {
      value: { fr: "Oui.", en: "Yes." },
      source: "https://framegrove.bamstudio.dev/",
    },
    ascUpload: {
      value: { fr: "Non.", en: "No." },
      source: "https://github.com/tech-bam/framegrove",
    },
  },
];

export const COMPARE_PAGE_COPY: Record<
  Locale,
  { title: string; description: string; heading: string; lead: string; closing: string; disclaimer: string; pricesNote: string }
> = {
  fr: {
    title: "Comparatif des générateurs de captures App Store",
    description:
      "Comparez DuoShot avec Shipper, Screenies, Rotato et Framegrove : ce générateur de captures App Store iPhone Duo face aux tailles, à l’export ZIP et au dépôt.",
    heading: "Comparatif des générateurs de captures App Store",
    lead: "Comparez DuoShot aux autres générateurs de captures App Store pour iPhone Duo : plateforme, prix, tailles iPhone Duo, export ZIP et dépôt.",
    closing:
      "Chaque outil a ses atouts : choisissez selon la plateforme (web ou Mac), le modèle de prix (abonnement, pass ou achat unique) et votre besoin de tailles iPhone Duo dès maintenant.",
    disclaimer:
      "DuoShot fournit un ZIP ; vous déposez les fichiers manuellement. Le dépôt iPhone Duo dans App Store Connect n’a pas été testé par DuoShot.",
    pricesNote: "Prix relevés le 25/10/2026",
  },
  en: {
    title: "App Store screenshot generator comparison",
    description:
      "Compare DuoShot with Shipper, Screenies, Rotato and Framegrove — an iPhone Duo App Store screenshot generator — across sizes, ZIP export and upload.",
    heading: "App Store screenshot generator comparison",
    lead: "Compare DuoShot with other App Store screenshot generators for iPhone Duo: platform, price, iPhone Duo sizes, ZIP export and upload.",
    closing:
      "Each tool has its own strengths: pick by platform (web or Mac), pricing model (subscription, pass or one-time) and whether you need iPhone Duo sizes today.",
    disclaimer:
      "DuoShot provides a ZIP; you upload the files manually. iPhone Duo uploads to App Store Connect have not been tested by DuoShot.",
    pricesNote: "Prices checked on Oct 25, 2026",
  },
};

/** Sitemap route pairs for the comparison page — present only once published. */
export function comparePublishedRoutes(published: boolean = COMPARE_PAGE_PUBLISHED): (typeof COMPARE_ROUTE)[] {
  return published ? [COMPARE_ROUTE] : [];
}

/** The /llms.txt line for the comparison page — empty until published. */
export function compareLlmsEntry(baseUrl: string, published: boolean = COMPARE_PAGE_PUBLISHED): string {
  if (!published) return "";
  return `- App Store screenshot generator comparison: ${baseUrl}${COMPARE_ROUTE.fr} (EN: ${baseUrl}${COMPARE_ROUTE.en})`;
}

/** noindex while the page is unpublished; indexable once the flag flips. */
export function compareRobots(published: boolean = COMPARE_PAGE_PUBLISHED): Metadata["robots"] {
  return published ? undefined : { index: false, follow: false };
}
