import type { Locale } from "./specs";
import { DUO_SIZES_VERIFIED_ON, SIZE_1206_VERIFIED_ON, type ScreenshotSize } from "./screenshot-pages";
import { formatCheckedOn } from "./specs-enrichment";

/** Apple's verbatim badge sentence from the Screenshot specifications page, kept in English in both locales. */
const APPLE_DUO_BADGE_QUOTE =
  "When you submit iPhone Duo screenshots in App Store Connect, your App Store product page will display a badge to let people know your app is made for iPhone Duo.";

/*
 * Per-size, per-locale enrichment rendered by SizePage alongside the FAQ: the devices an App Store
 * Connect slot covers, the portrait/landscape orientation, and the rejection causes to rule out.
 * Every fact is grounded in the repo's Apple source of truth (developer.apple.com screenshot
 * specifications): the Dynamic Island medium/large display device groups and their accepted sizes,
 * and the iPhone Duo outer/inner screenshot sizes with the no-alpha, PNG-or-JPEG file rules. The
 * copy never claims both Duo sizes are required and never says the App Store Connect upload is
 * tested. See also the visible FAQ in size-faq.ts.
 */

/** A size cell split into parts so one segment (e.g. the page's own size) can be emphasized. */
export type SlotSizes = { text: string; strong?: boolean }[];
export type SlotRow = { group: string; sizes: SlotSizes; status: string };

/** Optional comparison table, only on the 1206x2622 page: the iPhone App Store Connect slots. */
export type SizeSlots = {
  heading: string;
  columns: [string, string, string];
  rows: SlotRow[];
  source: string;
  note: string;
};

/** Optional extra "Related" links (hrefs computed in SizePage). */
export type SizeRelated = { duoGuide: string; checker: string; rejection: string };

/** A verbatim Apple quote with its source label; several are listed, never merged. */
export type TimelineQuote = { text: string; cite: string };

/** Optional "April 2027" timeline block: Apple's two wordings, quoted separately. */
export type SizeTimeline = { heading: string; intro: string; quotes: TimelineQuote[] };

/** Optional "Display scaling" block, only on 1206x2622: Apple's scaling rule quoted verbatim plus how the set satisfies the required slot. */
export type SizeScaling = { heading: string; intro: string; quote: string; cite: string; body: string };

/** Optional device-page links block, only on 1206x2622: the models Apple lists in the medium-display group. */
export type SizeDeviceLinks = { heading: string; intro: string };

export type SizeEnrichment = {
  devices: { heading: string; body: string };
  orientation: { heading: string; body: string };
  rejections: { heading: string; intro: string; items: string[] };
  slots?: SizeSlots;
  scaling?: SizeScaling;
  deviceLinks?: SizeDeviceLinks;
  related?: SizeRelated;
  timeline?: SizeTimeline;
};

const HEADINGS = {
  fr: { devices: "Appareils concernés", orientation: "Orientation : portrait ou paysage", rejections: "Erreurs de dépôt fréquentes" },
  en: { devices: "Supported devices", orientation: "Orientation: portrait or landscape", rejections: "Common upload mistakes" },
} as const;

function enrichment(
  locale: Locale,
  devicesBody: string,
  orientationBody: string,
  rejectionsIntro: string,
  rejectionsItems: string[],
  extra?: { slots?: SizeSlots; scaling?: SizeScaling; deviceLinks?: SizeDeviceLinks; related?: SizeRelated; timeline?: SizeTimeline },
): SizeEnrichment {
  const h = HEADINGS[locale];
  return {
    devices: { heading: h.devices, body: devicesBody },
    orientation: { heading: h.orientation, body: orientationBody },
    rejections: { heading: h.rejections, intro: rejectionsIntro, items: rejectionsItems },
    ...extra,
  };
}

/** The 1206 × 2622 comparison table, grounded verbatim in Apple's screenshot specifications. */
const SLOTS_1206: Record<Locale, SizeSlots> = {
  fr: {
    heading: "1206 × 2622 face aux autres emplacements iPhone (spécifications Apple)",
    columns: ["Groupe App Store Connect (nom Apple)", "Tailles acceptées, portrait (paysage)", "Statut sur la page d’Apple"],
    rows: [
      {
        group: "« iPhone with Dynamic Island (medium display) » — iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro",
        sizes: [{ text: "1179 × 2556 (2556 × 1179) · " }, { text: "1206 × 2622 (2622 × 1206)", strong: true }],
        status: "Requis : au moins une capture",
      },
      {
        group: "« iPhone with Dynamic Island (large display) » — iPhone Air, 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max",
        sizes: [{ text: "1260 × 2736 · 1290 × 2796 · 1320 × 2868 (et paysages)" }],
        status: "Absent de la liste « Required device sizes » d’Apple ; si absent, mis à l’échelle depuis « iPhone with Face ID (large display) »",
      },
      {
        group: "« iPhone with Face ID (medium display) » — iPhone 17e, 16e, 14, 13 Pro, 13, 13 mini, 12 Pro, 12, 12 mini, 11 Pro, XS, X",
        sizes: [{ text: "1170 × 2532 · 1125 × 2436 · 1080 × 2340 (et paysages)" }],
        status: "Si absent, mis à l’échelle depuis « iPhone with Dynamic Island (medium display) »",
      },
      {
        group: "« iPhone Duo »",
        sizes: [{ text: "1398 × 2034 (externe) · 2007 × 2853 (interne) (et paysages)" }],
        status: "Apple : requis à partir d’avril 2027 pour les apps utilisant le SDK iOS 27.1 ou ultérieur",
      },
    ],
    source: `Source : Apple, Screenshot specifications, vérifié le ${formatCheckedOn("fr", SIZE_1206_VERIFIED_ON)}. Formats : .jpeg, .jpg ou .png, 1 à 10 captures par taille d’appareil, sans canal alpha ni transparence.`,
    note: "Un jeu 1206 × 2622 alimente aussi l’ancien emplacement Face ID (écran moyen), car Apple met à l’échelle depuis « iPhone with Dynamic Island (medium display) » quand cet emplacement est vide.",
  },
  en: {
    heading: "1206 × 2622 vs the other iPhone slots (Apple specifications)",
    columns: ["App Store Connect group (Apple name)", "Accepted sizes, portrait (landscape)", "Status on Apple’s page"],
    rows: [
      {
        group: "iPhone with Dynamic Island (medium display) — iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro",
        sizes: [{ text: "1179 × 2556 (2556 × 1179) · " }, { text: "1206 × 2622 (2622 × 1206)", strong: true }],
        status: "Required: at least one screenshot",
      },
      {
        group: "iPhone with Dynamic Island (large display) — iPhone Air, 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max",
        sizes: [{ text: "1260 × 2736 · 1290 × 2796 · 1320 × 2868 (and landscapes)" }],
        status: "Not in Apple’s \"Required device sizes\" list; if missing, scaled from iPhone with Face ID (large display)",
      },
      {
        group: "iPhone with Face ID (medium display) — iPhone 17e, 16e, 14, 13 Pro, 13, 13 mini, 12 Pro, 12, 12 mini, 11 Pro, XS, X",
        sizes: [{ text: "1170 × 2532 · 1125 × 2436 · 1080 × 2340 (and landscapes)" }],
        status: "If missing, scaled from iPhone with Dynamic Island (medium display)",
      },
      {
        group: "iPhone Duo",
        sizes: [{ text: "1398 × 2034 (outer) · 2007 × 2853 (inner) (and landscapes)" }],
        status: "Apple: required from April 2027 for apps using the iOS 27.1 SDK or later",
      },
    ],
    source: `Source: Apple, Screenshot specifications, checked ${formatCheckedOn("en", SIZE_1206_VERIFIED_ON)}. Formats: .jpeg, .jpg or .png, 1 to 10 screenshots per device size, no alpha channels or transparencies.`,
    note: "A 1206 × 2622 set also feeds the older Face ID medium-display slot, because Apple scales from Dynamic Island (medium display) when that slot is empty.",
  },
};

/** Extra "Related" link labels for the Duo pages; hrefs are built in SizePage. */
const RELATED_1206: Record<Locale, SizeRelated> = {
  fr: { duoGuide: "Taille des captures iPhone Duo", checker: "Vérifier une capture iPhone Duo", rejection: "Quoi vérifier avant la revue App Store" },
  en: { duoGuide: "iPhone Duo screenshot size", checker: "Check an iPhone Duo screenshot", rejection: "What to check before App Store review" },
};

/** Apple's display-scaling rule, quoted verbatim in both locales, plus how a 1206 × 2622 set satisfies the required iPhone slot. */
const SCALING_1206: Record<Locale, SizeScaling> = {
  fr: {
    heading: "Mise à l’échelle des captures (Display scaling, Apple)",
    intro: "Les Screenshot specifications d’Apple indiquent :",
    quote: "If your app’s user interface is consistent across multiple device sizes and localizations, you only need to provide screenshots for the highest required resolution. App Store Connect automatically scales them down for smaller device sizes.",
    cite: "Apple, Screenshot specifications",
    body: "Pour l’iPhone, la liste « Required device sizes » d’Apple nomme « At least one screenshot for iPhone with Dynamic Island (medium display). » Ce groupe accepte 1206 × 2622 ou 1179 × 2556 en portrait (et leurs paysages) : un jeu en 1206 × 2622 y répond.",
  },
  en: {
    heading: "Display scaling (Apple)",
    intro: "Apple’s Screenshot specifications say:",
    quote: "If your app’s user interface is consistent across multiple device sizes and localizations, you only need to provide screenshots for the highest required resolution. App Store Connect automatically scales them down for smaller device sizes.",
    cite: "Apple, Screenshot specifications",
    body: "For iPhone, Apple’s “Required device sizes” list names “At least one screenshot for iPhone with Dynamic Island (medium display).” That group accepts 1206 × 2622 or 1179 × 2556 in portrait (and their landscapes), so a 1206 × 2622 set meets it.",
  },
};

/** The models Apple lists under "iPhone with Dynamic Island (medium display)" that have a device guide page (no iphone-14-pro page). */
export const MEDIUM_DISPLAY_DEVICE_SLUGS = [
  "iphone-18-pro",
  "iphone-17-pro",
  "iphone-17",
  "iphone-16-pro",
  "iphone-16",
  "iphone-15-pro",
  "iphone-15",
] as const;

/** Device-page link block for the 1206 × 2622 page; the links themselves are built in SizePage from MEDIUM_DISPLAY_DEVICE_SLUGS. */
const DEVICE_LINKS_1206: Record<Locale, SizeDeviceLinks> = {
  fr: {
    heading: "Taille des captures par appareil (écran moyen)",
    intro: "Pages appareil des modèles qu’Apple liste dans ce groupe :",
  },
  en: {
    heading: "Screenshot size by device (medium display)",
    intro: "Device pages for the models Apple lists in this group:",
  },
};

/**
 * The iPhone Duo comparison table for the outer (1398 × 2034) and inner (2007 × 2853) pages. It lists
 * both Duo display sizes and — on a SEPARATE row — the still-required iPhone with Dynamic Island
 * (medium display) group, so the page never implies Duo screenshots replace that required set.
 * `emphasize` bolds the size the current page is about. Grounded verbatim in Apple's specifications.
 */
function duoSlots(locale: Locale, emphasize: "outer" | "inner"): SizeSlots {
  if (locale === "fr") {
    const duoSizes: SlotSizes = [
      { text: "Externe : 1398 × 2034 (2034 × 1398)", strong: emphasize === "outer" },
      { text: "Interne : 2007 × 2853 (2853 × 2007)", strong: emphasize === "inner" },
    ];
    return {
      heading: "Tailles iPhone Duo et emplacement requis distinct (spécifications Apple)",
      columns: ["Groupe App Store Connect (nom Apple)", "Tailles acceptées, portrait (paysage)", "Statut sur la page d’Apple"],
      rows: [
        {
          group: "iPhone Duo (écran externe ou écran interne)",
          sizes: duoSizes,
          status: "Apple : requis à partir d’avril 2027 pour les apps utilisant le SDK iOS 27.1 ou ultérieur ; Apple liste les deux écrans sans dire qu’il faut fournir les deux",
        },
        {
          group: "« iPhone with Dynamic Island (medium display) » — emplacement distinct, toujours requis",
          sizes: [{ text: "1179 × 2556 (2556 × 1179) · 1206 × 2622 (2622 × 1206)" }],
          status: "Requis : au moins une capture pour soumettre une app iPhone",
        },
      ],
      source: `Source : Apple, Screenshot specifications, vérifié le ${formatCheckedOn("fr", DUO_SIZES_VERIFIED_ON)}. Formats : .jpeg, .jpg ou .png, 1 à 10 captures par taille d’appareil, sans canal alpha ni transparence.`,
      note: "Les tailles externe et interne de l’iPhone Duo forment un groupe distinct du groupe « iPhone with Dynamic Island (medium display) » requis : déposer des captures Duo ne remplit pas cet emplacement requis.",
    };
  }
  const duoSizes: SlotSizes = [
    { text: "Outer: 1398 × 2034 (2034 × 1398)", strong: emphasize === "outer" },
    { text: "Inner: 2007 × 2853 (2853 × 2007)", strong: emphasize === "inner" },
  ];
  return {
    heading: "iPhone Duo sizes and the separate required slot (Apple specifications)",
    columns: ["App Store Connect group (Apple name)", "Accepted sizes, portrait (landscape)", "Status on Apple’s page"],
    rows: [
      {
        group: "iPhone Duo (outer or inner display)",
        sizes: duoSizes,
        status: "Apple: required from April 2027 for apps using the iOS 27.1 SDK or later; Apple lists both displays without saying you must provide both",
      },
      {
        group: "iPhone with Dynamic Island (medium display) — separate group, still required",
        sizes: [{ text: "1179 × 2556 (2556 × 1179) · 1206 × 2622 (2622 × 1206)" }],
        status: "Required: at least one screenshot to submit an iPhone app",
      },
    ],
    source: `Source: Apple, Screenshot specifications, checked ${formatCheckedOn("en", DUO_SIZES_VERIFIED_ON)}. Formats: .jpeg, .jpg or .png, 1 to 10 screenshots per device size, no alpha channels or transparencies.`,
    note: "The iPhone Duo outer and inner sizes are a separate group from the required iPhone with Dynamic Island (medium display): submitting Duo screenshots does not fill that required slot.",
  };
}

/**
 * Apple words the April 2027 requirement in two places. We quote both VERBATIM and never merge them:
 * the specifications page ties it to the iOS 27.1 SDK; the October 5, 2026 developer news to submissions.
 */
const DUO_TIMELINE: Record<Locale, SizeTimeline> = {
  fr: {
    heading: "Calendrier : avril 2027",
    intro: "Apple formule l’échéance d’avril 2027 à deux endroits, différemment. Les deux citations ci-dessous sont reproduites telles quelles, sans être fusionnées :",
    quotes: [
      { text: "Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.", cite: "Apple, Screenshot specifications" },
      { text: "Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.", cite: "Apple, actualité développeurs iPhone Duo, 5 octobre 2026" },
    ],
  },
  en: {
    heading: "April 2027 timeline",
    intro: "Apple words the April 2027 deadline in two places, differently. Both quotes below are reproduced as-is, not merged:",
    quotes: [
      { text: "Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.", cite: "Apple, Screenshot specifications" },
      { text: "Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.", cite: "Apple, iPhone Duo developer news, October 5, 2026" },
    ],
  },
};

const SIZE_ENRICHMENT: Record<ScreenshotSize, Record<Locale, SizeEnrichment>> = {
  "1206x2622": {
    fr: enrichment("fr",
      "Cette taille vise le groupe « iPhone with Dynamic Island (medium display) » d’App Store Connect : iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15 et 14 Pro. Le groupe accepte 1206 × 2622 ou 1179 × 2556 pixels en portrait (et leurs paysages). App Store Connect exige au moins une capture dans ce groupe pour soumettre une app iPhone. La note d’Apple pour ce groupe précise que, si les tailles acceptées ne sont pas fournies, des captures mises à l’échelle depuis « iPhone with Face ID (large display) » sont utilisées.",
      "En portrait, exportez 1206 × 2622 pixels ; en paysage, 2622 × 1206 pixels. Gardez une orientation cohérente sur toute la série de captures de cet emplacement.",
      "Avant de déposer vos captures 1206 × 2622, écartez ces erreurs fréquentes :",
      [
        "Mauvaise taille : déposez exactement 1206 × 2622 pixels en portrait (ou 2622 × 1206 en paysage). Apple ne liste que 1206 × 2622 et 1179 × 2556 (et leurs versions paysage) pour ce groupe.",
        "Transparence ou canal alpha : aplatissez le fond. Les images ne peuvent pas comporter de canal alpha ni de zones transparentes.",
        "Mauvais format : Apple n’accepte que .jpeg, .jpg ou .png.",
        "Mauvais emplacement : un fichier 1320 × 2868 appartient à « iPhone with Dynamic Island (large display) », et 1398 × 2034 ou 2007 × 2853 à « iPhone Duo ». Aucun ne remplit l’emplacement « medium display » requis.",
        "Orientation inversée ou un pixel de travers : 2622 × 1206 est la taille paysage, et 1206 × 2621 ou 1205 × 2622 ne figure pas sur la liste d’Apple. Vérifiez le nombre exact de pixels avant le dépôt. Sur un Mac, « sips -g pixelWidth -g pixelHeight -g hasAlpha fichier.png » affiche la taille et le canal alpha.",
        "Réduction proportionnelle depuis une taille iPhone plus grande : 1320 × 2868 ramené à 1206 px de large donne 1206 × 2620 (2 px de moins que 2622), et 1290 × 2796 ramené à 1179 px de large donne 1179 × 2555 (1 px de moins que 2556). Aucune de ces tailles ne figure sur la liste d’Apple pour ce groupe. Exportez directement en 1206 × 2622, ou complétez ou recadrez jusqu’à la taille exacte.",
      ],
      { slots: SLOTS_1206.fr, scaling: SCALING_1206.fr, deviceLinks: DEVICE_LINKS_1206.fr, related: RELATED_1206.fr }),
    en: enrichment("en",
      "This size targets App Store Connect’s “iPhone with Dynamic Island (medium display)” group: iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15 and 14 Pro. The group accepts 1206 × 2622 or 1179 × 2556 pixels in portrait (and their landscapes). App Store Connect requires at least one screenshot in this group to submit an iPhone app. Apple’s note for the group says that if the accepted sizes aren’t provided, scaled screenshots for iPhone with Face ID (large display) are used.",
      "In portrait, export 1206 × 2622 pixels; in landscape, 2622 × 1206 pixels. Keep one consistent orientation across the whole set for this slot.",
      "Before you upload your 1206 × 2622 screenshots, rule out these common mistakes:",
      [
        "Wrong size: upload exactly 1206 × 2622 pixels in portrait (or 2622 × 1206 in landscape). Apple lists only 1206 × 2622 and 1179 × 2556 (and their landscape versions) for this group.",
        "Transparency or alpha channel: flatten the background. Images can’t include an alpha channel or transparent areas.",
        "Wrong format: Apple accepts only .jpeg, .jpg or .png.",
        "Wrong slot: a 1320 × 2868 file belongs to iPhone with Dynamic Island (large display), and 1398 × 2034 or 2007 × 2853 to iPhone Duo. Neither fills the required medium-display slot.",
        "Swapped orientation or one pixel off: 2622 × 1206 is the landscape size, and 1206 × 2621 or 1205 × 2622 is not on Apple’s list. Check the exact pixel count before uploading. On a Mac, “sips -g pixelWidth -g pixelHeight -g hasAlpha file.png” shows size and alpha.",
        "Straight downscale from a larger iPhone size: resizing 1320 × 2868 to 1206 px wide gives 1206 × 2620 (2 px short of 2622), and resizing 1290 × 2796 to 1179 px wide gives 1179 × 2555 (1 px short of 2556). Neither is on Apple’s list for this group. Export natively at 1206 × 2622, or pad or crop to the exact size.",
      ],
      { slots: SLOTS_1206.en, scaling: SCALING_1206.en, deviceLinks: DEVICE_LINKS_1206.en, related: RELATED_1206.en }),
  },
  "1320x2868": {
    fr: enrichment("fr",
      "Cette taille vise le groupe « iPhone with Dynamic Island (large display) » : iPhone Air, iPhone 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus et 14 Pro Max. Le groupe accepte 1320 × 2868, 1290 × 2796 ou 1260 × 2736 pixels en portrait (et leurs paysages) ; ces tailles appartiennent toutes au même groupe et aucune n’est liée à un modèle précis.",
      "En portrait, exportez 1320 × 2868 pixels ; en paysage, 2868 × 1320 pixels. Choisissez une orientation et conservez-la pour cet emplacement 6,9 pouces.",
      "Pour que vos captures 1320 × 2868 soient acceptées, écartez ces causes de rejet :",
      [
        "Mauvaise taille : déposez 1320 × 2868 pixels en portrait (ou 2868 × 1320 en paysage), ou l’un des autres formats du groupe. Un fichier hors de ces dimensions est refusé.",
        "Transparence ou canal alpha : exportez un fond opaque, sans canal alpha ni zone transparente.",
        "Mauvais format : seuls le PNG et le JPEG sont acceptés ; convertissez tout HEIC, WebP ou PDF avant le dépôt.",
      ]),
    en: enrichment("en",
      "This size targets the “iPhone with Dynamic Island (large display)” group: iPhone Air, iPhone 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus and 14 Pro Max. The group accepts 1320 × 2868, 1290 × 2796 or 1260 × 2736 pixels in portrait (and their landscapes); these sizes all belong to the same group and none maps to a specific model.",
      "In portrait, export 1320 × 2868 pixels; in landscape, 2868 × 1320 pixels. Pick one orientation and keep it for this 6.9-inch slot.",
      "To get your 1320 × 2868 screenshots accepted, rule out these rejection causes:",
      [
        "Wrong size: upload 1320 × 2868 pixels in portrait (or 2868 × 1320 in landscape), or one of the group’s other formats. A file outside these dimensions is rejected.",
        "Transparency or alpha channel: export an opaque background, with no alpha channel or transparent area.",
        "Wrong format: only PNG and JPEG are accepted; convert any HEIC, WebP or PDF before uploading.",
      ]),
  },
  "1398x2034": {
    fr: enrichment("fr",
      `Cette taille correspond à l’écran externe de l’iPhone Duo, le téléphone pliable d’Apple (fermé). À partir d’avril 2027, les captures iPhone Duo sont requises pour les apps compilées avec le SDK iOS 27.1 ou ultérieur ; déposer des captures Duo affiche un badge indiquant que votre app est conçue pour l’iPhone Duo. Apple : « ${APPLE_DUO_BADGE_QUOTE} »`,
      "En portrait, exportez 1398 × 2034 pixels ; en paysage, 2034 × 1398 pixels. Montrez votre app sur l’écran externe fermé.",
      "Avant de déposer vos captures de l’écran externe, écartez ces erreurs :",
      [
        "Mauvaise taille : déposez 1398 × 2034 pixels en portrait (ou 2034 × 1398 en paysage) pour l’écran externe. Apple ne liste que ces deux dimensions pour l’écran externe.",
        "Transparence ou canal alpha : les images ne peuvent pas comporter de canal alpha ni de transparence. Exportez un fond plein.",
        "Mauvais format : Apple liste .jpeg, .jpg et .png.",
        "Mauvais écran : 2007 × 2853 correspond à l’écran interne, pas à l’écran externe. Ne mélangez pas un fichier interne avec les tailles de l’écran externe.",
        "Mauvais ratio : une capture 1206 × 2622 étirée en 1398 × 2034 est déformée, car ces deux formats n’ont pas les mêmes proportions. Recadrez ou refaites la capture, n’étirez pas.",
      ],
      { slots: duoSlots("fr", "outer"), related: RELATED_1206.fr, timeline: DUO_TIMELINE.fr }),
    en: enrichment("en",
      `This size is the outer display of the iPhone Duo, Apple’s foldable iPhone (closed). From April 2027, iPhone Duo screenshots are required for apps built with the iOS 27.1 SDK or later; Apple: “${APPLE_DUO_BADGE_QUOTE}”`,
      "In portrait, export 1398 × 2034 pixels; in landscape, 2034 × 1398 pixels. Show your app on the closed outer display.",
      "Before uploading outer-display screenshots, rule out these mistakes:",
      [
        "Wrong size: upload 1398 × 2034 pixels in portrait (or 2034 × 1398 in landscape) for the outer display. Apple lists only these two dimensions for the outer display.",
        "Transparency or alpha channel: images can’t include an alpha channel or transparency. Export a solid background.",
        "Wrong format: Apple lists .jpeg, .jpg and .png.",
        "Wrong display: 2007 × 2853 is the inner display, not the outer display. Don’t mix an inner-display file in with the outer-display sizes.",
        "Wrong aspect ratio: a 1206 × 2622 screenshot stretched to 1398 × 2034 is distorted, because the two sizes have different proportions. Recrop or redo the screenshot instead of stretching it.",
      ],
      { slots: duoSlots("en", "outer"), related: RELATED_1206.en, timeline: DUO_TIMELINE.en }),
  },
  "2007x2853": {
    fr: enrichment("fr",
      `Cette taille correspond à l’écran interne de l’iPhone Duo (ouvert). À partir d’avril 2027, les captures iPhone Duo sont requises pour les apps compilées avec le SDK iOS 27.1 ou ultérieur ; déposer des captures Duo affiche un badge indiquant que votre app est conçue pour l’iPhone Duo. Apple : « ${APPLE_DUO_BADGE_QUOTE} »`,
      "En portrait, exportez 2007 × 2853 pixels ; en paysage, 2853 × 2007 pixels. Montrez l’interface déployée de votre app sur l’écran interne.",
      "Avant de déposer vos captures de l’écran interne, écartez ces erreurs :",
      [
        "Mauvaise taille : déposez 2007 × 2853 pixels en portrait (ou 2853 × 2007 en paysage), la taille de capture App Store Connect pour l’écran interne. Apple ne liste que ces deux dimensions pour l’écran interne.",
        "Transparence ou canal alpha : aplatissez le fond ; Apple indique que les images ne peuvent pas comporter de canal alpha ni de transparence.",
        "Mauvais format : Apple liste .jpeg, .jpg et .png.",
        "Mauvais écran : 2007 × 2853 est l’écran interne ; 1398 × 2034 correspond à l’écran externe, pas à l’écran interne. Ne déposez pas un fichier externe parmi les tailles internes.",
        "Mauvais ratio : une capture 1206 × 2622 étirée en 2007 × 2853 est déformée, car ces deux formats n’ont pas les mêmes proportions. Recadrez ou refaites la capture, n’étirez pas.",
      ],
      { slots: duoSlots("fr", "inner"), related: RELATED_1206.fr, timeline: DUO_TIMELINE.fr }),
    en: enrichment("en",
      `This size is the inner display of the iPhone Duo (open). From April 2027, iPhone Duo screenshots are required for apps built with the iOS 27.1 SDK or later; Apple: “${APPLE_DUO_BADGE_QUOTE}”`,
      "In portrait, export 2007 × 2853 pixels; in landscape, 2853 × 2007 pixels. Show your app’s expanded layout on the inner display.",
      "Before uploading inner-display screenshots, rule out these mistakes:",
      [
        "Wrong size: upload 2007 × 2853 pixels in portrait (or 2853 × 2007 in landscape), the App Store Connect screenshot size for the inner display. Apple lists only these two dimensions for the inner display.",
        "Transparency or alpha channel: flatten the background; Apple says images can’t include alpha channels or transparencies.",
        "Wrong format: Apple lists .jpeg, .jpg and .png.",
        "Wrong display: 2007 × 2853 is the inner display; 1398 × 2034 is the outer display, not the inner one. Don’t upload an outer-display file in with the inner-display sizes.",
        "Wrong aspect ratio: a 1206 × 2622 screenshot stretched to 2007 × 2853 is distorted, because the two sizes have different proportions. Recrop or redo the screenshot instead of stretching it.",
      ],
      { slots: duoSlots("en", "inner"), related: RELATED_1206.en, timeline: DUO_TIMELINE.en }),
  },
};

export function sizeEnrichment(locale: Locale, size: ScreenshotSize): SizeEnrichment {
  return SIZE_ENRICHMENT[size][locale];
}
