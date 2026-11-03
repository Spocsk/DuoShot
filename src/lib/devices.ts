import type { Locale } from "./specs";

/*
 * Single source of truth for the programmatic /guides/screenshot-size/<device> pages.
 *
 * Every device name, display-group name and pixel size is copied verbatim from Apple's
 * screenshot specifications (docs/sources/apple-screenshot-specifications-2026-11-03.txt).
 * Apple publishes one list of accepted sizes per DISPLAY GROUP, not per device: each device
 * here carries the full list of accepted sizes for its group, and the copy says
 * "App Store Connect accepts these sizes for the <group> group". We never claim a resolution
 * is a device's native panel size, never invent a per-device simulator model or inch value,
 * and — for iPhone Duo — never say both the outer and inner sizes are required (App Store
 * Connect accepts the outer and inner display sizes). See src/lib/device-page-copy.ts for the
 * copy derived from this data and devices.test.ts for the verbatim checks against the source.
 */

export type Platform = "iphone" | "ipad" | "mac" | "tv" | "vision" | "watch";
export type DeviceOrientation = "portrait" | "landscape" | "other";

export type DeviceSize = {
  width: number;
  height: number;
  orientation: DeviceOrientation;
  /** Apple's parenthetical label for the size (outer/inner display, Watch series). */
  note?: { fr: string; en: string };
};

export type LocalizedText = { fr: string; en: string };

export type Device = {
  slug: string;
  /** Exact Apple device string; must appear verbatim in the source file. */
  name: string;
  /** Disambiguates devices that share an Apple name across display sizes (e.g. iPad Pro 13"/11"). */
  displaySize?: string;
  platform: Platform;
  /** Apple display-group name; FR translates descriptive words only, keeping device names. */
  group: LocalizedText;
  /** The full list of sizes App Store Connect accepts for this group. */
  sizes: DeviceSize[];
  /** Only what Apple states: the required rule and/or the scaled-fallback note. */
  requirement: LocalizedText;
  /** Generic, factual rejection causes. */
  commonErrors: { fr: string[]; en: string[] };
  /** 2-4 related device slugs; all resolve to a DEVICES entry. */
  neighbors: string[];
  /** An existing DuoShot size page when a matching size exists, else undefined (link the tool). */
  generatorSize?: string;
  /** True when no matching size page exists, so the CTA points at the generator tool. */
  toolPath?: boolean;
};

export const DEVICE_VERIFIED_ON = "2026-11-03";
export const SCREENSHOT_SIZE_BASE_PATH = "/guides/screenshot-size";

export function deviceGuidePath(slug: string): string {
  return `${SCREENSHOT_SIZE_BASE_PATH}/${slug}`;
}

const p = (width: number, height: number, note?: LocalizedText): DeviceSize => ({ width, height, orientation: "portrait", note });
const l = (width: number, height: number, note?: LocalizedText): DeviceSize => ({ width, height, orientation: "landscape", note });

const OUTER: LocalizedText = { fr: "écran externe", en: "outer display" };
const INNER: LocalizedText = { fr: "écran interne", en: "inner display" };
const watchNote = (series: string): LocalizedText => ({ fr: series, en: series });

const BASE_ERRORS = {
  fr: [
    "Mauvaises dimensions en pixels : un fichier qui ne correspond pas exactement à l’une des tailles acceptées est refusé.",
    "Canal alpha ou transparence : les captures ne peuvent pas comporter de canal alpha ni de zones transparentes ; exportez une image opaque.",
    "Format non pris en charge : App Store Connect n’accepte que les fichiers PNG, JPG ou JPEG.",
    "Trop de captures : vous pouvez déposer jusqu’à 10 captures par taille d’appareil.",
  ],
  en: [
    "Wrong pixel dimensions: a file that does not match one of the accepted sizes exactly is rejected.",
    "Alpha channel or transparency: screenshots can’t include an alpha channel or transparent areas; export an opaque image.",
    "Unsupported format: App Store Connect accepts only PNG, JPG or JPEG files.",
    "Too many screenshots: you can upload up to 10 screenshots per device size.",
  ],
} as const;

const WATCH_ERRORS = {
  fr: [...BASE_ERRORS.fr, "Tailles Apple Watch incohérentes : utilisez la même taille de capture Apple Watch dans toutes les localisations."],
  en: [...BASE_ERRORS.en, "Mismatched Watch sizes: use the same Apple Watch screenshot size across every localization."],
} as const;

/** A display group: its localized name, the sizes Apple accepts for it, and the shared requirement copy. */
type Group = {
  platform: Platform;
  group: LocalizedText;
  sizes: DeviceSize[];
  requirement: LocalizedText;
  errors: { fr: readonly string[]; en: readonly string[] };
  generatorSize?: string;
  displaySize?: string;
};

type Entry = { slug: string; name: string; group: Group; displaySize?: string };

const DUO: Group = {
  platform: "iphone",
  group: { fr: "iPhone Duo", en: "iPhone Duo" },
  sizes: [p(1398, 2034, OUTER), l(2034, 1398, OUTER), p(2007, 2853, INNER), l(2853, 2007, INNER)],
  requirement: {
    fr: "App Store Connect accepte les tailles de l’écran externe et de l’écran interne de l’iPhone Duo. À partir d’avril 2027, les captures seront exigées pour toute app utilisant le SDK iOS 27.1 ou ultérieur. Lorsque vous déposez des captures iPhone Duo, votre page produit App Store affiche un badge indiquant que votre app est optimisée pour l’iPhone Duo.",
    en: "App Store Connect accepts the iPhone Duo outer and inner display sizes. Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later. When you submit iPhone Duo screenshots, your App Store product page shows a badge letting people know your app is optimized for iPhone Duo.",
  },
  errors: BASE_ERRORS,
  generatorSize: "1398x2034",
};

const DI_LARGE: Group = {
  platform: "iphone",
  group: { fr: "iPhone avec Dynamic Island (grand écran)", en: "iPhone with Dynamic Island (large display)" },
  sizes: [p(1260, 2736), l(2736, 1260), p(1290, 2796), l(2796, 1290), p(1320, 2868), l(2868, 1320)],
  requirement: {
    fr: "Apple ne liste pas ce groupe parmi les tailles requises. Si vous ne fournissez pas de captures aux tailles acceptées, App Store Connect utilise des captures mises à l’échelle du groupe iPhone avec Face ID (grand écran).",
    en: "Apple doesn’t list this group among the required sizes. If you don’t provide screenshots at the accepted sizes, App Store Connect uses scaled screenshots from the iPhone with Face ID (large display) group.",
  },
  errors: BASE_ERRORS,
  generatorSize: "1320x2868",
};

const DI_MEDIUM: Group = {
  platform: "iphone",
  group: { fr: "iPhone avec Dynamic Island (écran moyen)", en: "iPhone with Dynamic Island (medium display)" },
  sizes: [p(1179, 2556), l(2556, 1179), p(1206, 2622), l(2622, 1206)],
  requirement: {
    fr: "Pour soumettre une app iPhone, App Store Connect exige au moins une capture pour le groupe iPhone avec Dynamic Island (écran moyen). À défaut, App Store Connect utilise des captures mises à l’échelle du groupe iPhone avec Face ID (grand écran).",
    en: "To submit an iPhone app, App Store Connect requires at least one screenshot for the iPhone with Dynamic Island (medium display) group. If you don’t provide the accepted sizes, App Store Connect uses scaled screenshots from the iPhone with Face ID (large display) group.",
  },
  errors: BASE_ERRORS,
  generatorSize: "1206x2622",
};

const FACE_ID_LARGE: Group = {
  platform: "iphone",
  group: { fr: "iPhone avec Face ID (grand écran)", en: "iPhone with Face ID (large display)" },
  sizes: [p(1284, 2778), l(2778, 1284), p(1242, 2688), l(2688, 1242)],
  requirement: {
    fr: "Requis si votre app tourne sur iPhone et que les captures du groupe iPhone avec Dynamic Island (grand écran) ne sont pas fournies. À défaut, App Store Connect utilise des captures mises à l’échelle du groupe iPhone avec Dynamic Island (grand écran).",
    en: "Required if your app runs on iPhone and screenshots for the iPhone with Dynamic Island (large display) group aren’t provided. If you don’t provide the accepted sizes, App Store Connect uses scaled screenshots from the iPhone with Dynamic Island (large display) group.",
  },
  errors: BASE_ERRORS,
};

const FACE_ID_MEDIUM: Group = {
  platform: "iphone",
  group: { fr: "iPhone avec Face ID (écran moyen)", en: "iPhone with Face ID (medium display)" },
  sizes: [p(1170, 2532), l(2532, 1170), p(1125, 2436), l(2436, 1125), p(1080, 2340), l(2340, 1080)],
  requirement: {
    fr: "Apple ne liste pas ce groupe parmi les tailles requises. Si vous ne fournissez pas de captures aux tailles acceptées, App Store Connect utilise des captures mises à l’échelle du groupe iPhone avec Dynamic Island (écran moyen).",
    en: "Apple doesn’t list this group among the required sizes. If you don’t provide screenshots at the accepted sizes, App Store Connect uses scaled screenshots from the iPhone with Dynamic Island (medium display) group.",
  },
  errors: BASE_ERRORS,
};

const HOME_LARGE: Group = {
  platform: "iphone",
  group: { fr: "iPhone avec bouton principal (grand écran)", en: "iPhone with Home Button (large display)" },
  sizes: [p(1242, 2208), l(2208, 1242)],
  requirement: {
    fr: "Apple ne liste pas ce groupe parmi les tailles requises. Si vous ne fournissez pas de captures aux tailles acceptées, App Store Connect utilise des captures mises à l’échelle du groupe iPhone avec Face ID (écran moyen).",
    en: "Apple doesn’t list this group among the required sizes. If you don’t provide screenshots at the accepted sizes, App Store Connect uses scaled screenshots from the iPhone with Face ID (medium display) group.",
  },
  errors: BASE_ERRORS,
};

const HOME_MEDIUM: Group = {
  platform: "iphone",
  group: { fr: "iPhone avec bouton principal (écran moyen)", en: "iPhone with Home Button (medium display)" },
  sizes: [p(750, 1334), l(1334, 750)],
  requirement: {
    fr: "Apple ne liste pas ce groupe parmi les tailles requises. Si vous ne fournissez pas de captures aux tailles acceptées, App Store Connect utilise des captures mises à l’échelle du groupe iPhone avec bouton principal (grand écran).",
    en: "Apple doesn’t list this group among the required sizes. If you don’t provide screenshots at the accepted sizes, App Store Connect uses scaled screenshots from the iPhone with Home Button (large display) group.",
  },
  errors: BASE_ERRORS,
};

const IPAD_13: Group = {
  platform: "ipad",
  group: { fr: "iPad écran 13 pouces", en: "iPad 13-inch display" },
  displaySize: '13"',
  sizes: [p(2064, 2752), l(2752, 2064), p(2048, 2732), l(2732, 2048)],
  requirement: {
    fr: "Requis si votre app tourne sur iPad.",
    en: "Required if your app runs on iPad.",
  },
  errors: BASE_ERRORS,
};

const IPAD_11: Group = {
  platform: "ipad",
  group: { fr: "iPad écran 11 pouces", en: "iPad 11-inch display" },
  displaySize: '11"',
  sizes: [p(1488, 2266), l(2266, 1488), p(1668, 2420), l(2420, 1668), p(1668, 2388), l(2388, 1668), p(1640, 2360), l(2360, 1640)],
  requirement: {
    fr: "Apple ne liste pas ce groupe parmi les tailles requises. Si vous ne fournissez pas de captures aux tailles acceptées, App Store Connect utilise des captures mises à l’échelle du groupe écran 13 pouces.",
    en: "Apple doesn’t list this group among the required sizes. If you don’t provide screenshots at the accepted sizes, App Store Connect uses scaled screenshots from the 13-inch display group.",
  },
  errors: BASE_ERRORS,
};

const MAC: Group = {
  platform: "mac",
  group: { fr: "Mac", en: "Mac" },
  sizes: [l(1280, 800), l(1440, 900), l(2560, 1600), l(2880, 1800)],
  requirement: {
    fr: "Requis pour les apps Mac. Choisissez l’une des tailles acceptées, au rapport 16:10.",
    en: "Required for Mac apps. Choose one of the accepted sizes, with a 16:10 aspect ratio.",
  },
  errors: BASE_ERRORS,
};

const APPLE_TV: Group = {
  platform: "tv",
  group: { fr: "Apple TV", en: "Apple TV" },
  sizes: [l(1920, 1080), l(3840, 2160)],
  requirement: { fr: "Requis pour les apps Apple TV.", en: "Required for Apple TV apps." },
  errors: BASE_ERRORS,
};

const APPLE_VISION: Group = {
  platform: "vision",
  group: { fr: "Apple Vision Pro", en: "Apple Vision Pro" },
  sizes: [l(3840, 2160)],
  requirement: { fr: "Requis pour les apps Apple Vision Pro.", en: "Required for Apple Vision Pro apps." },
  errors: BASE_ERRORS,
};

const APPLE_WATCH: Group = {
  platform: "watch",
  group: { fr: "Apple Watch", en: "Apple Watch" },
  sizes: [
    p(422, 514, watchNote("Ultra 4, Ultra 3")),
    p(410, 502, watchNote("Ultra 2, Ultra")),
    p(416, 496, watchNote("Series 12, Series 11, Series 10")),
    p(396, 484, watchNote("Series 9, Series 8, Series 7")),
    p(368, 448, watchNote("Series 6, Series 5, Series 4, SE 3, SE 2, SE")),
    p(312, 390, watchNote("Series 3, Series 2, Series 1")),
  ],
  requirement: {
    fr: "Requis pour les apps Apple Watch. Utilisez la même taille de capture Apple Watch de façon cohérente dans toutes les localisations.",
    en: "Required for Apple Watch apps. Use the same Apple Watch screenshot size consistently across all localizations.",
  },
  errors: WATCH_ERRORS,
};

const ENTRIES: Entry[] = [
  { slug: "iphone-duo", name: "iPhone Duo", group: DUO },

  { slug: "iphone-air", name: "iPhone Air", group: DI_LARGE },
  { slug: "iphone-18-pro-max", name: "iPhone 18 Pro Max", group: DI_LARGE },
  { slug: "iphone-17-pro-max", name: "iPhone 17 Pro Max", group: DI_LARGE },
  { slug: "iphone-16-pro-max", name: "iPhone 16 Pro Max", group: DI_LARGE },
  { slug: "iphone-16-plus", name: "iPhone 16 Plus", group: DI_LARGE },
  { slug: "iphone-15-pro-max", name: "iPhone 15 Pro Max", group: DI_LARGE },
  { slug: "iphone-15-plus", name: "iPhone 15 Plus", group: DI_LARGE },
  { slug: "iphone-14-pro-max", name: "iPhone 14 Pro Max", group: DI_LARGE },

  { slug: "iphone-18-pro", name: "iPhone 18 Pro", group: DI_MEDIUM },
  { slug: "iphone-17-pro", name: "iPhone 17 Pro", group: DI_MEDIUM },
  { slug: "iphone-17", name: "iPhone 17", group: DI_MEDIUM },
  { slug: "iphone-16-pro", name: "iPhone 16 Pro", group: DI_MEDIUM },
  { slug: "iphone-16", name: "iPhone 16", group: DI_MEDIUM },
  { slug: "iphone-15-pro", name: "iPhone 15 Pro", group: DI_MEDIUM },
  { slug: "iphone-15", name: "iPhone 15", group: DI_MEDIUM },

  { slug: "iphone-14-plus", name: "iPhone 14 Plus", group: FACE_ID_LARGE },
  { slug: "iphone-13-pro-max", name: "iPhone 13 Pro Max", group: FACE_ID_LARGE },

  { slug: "iphone-17e", name: "iPhone 17e", group: FACE_ID_MEDIUM },
  { slug: "iphone-16e", name: "iPhone 16e", group: FACE_ID_MEDIUM },
  { slug: "iphone-14", name: "iPhone 14", group: FACE_ID_MEDIUM },
  { slug: "iphone-13", name: "iPhone 13", group: FACE_ID_MEDIUM },

  { slug: "iphone-8-plus", name: "iPhone 8 Plus", group: HOME_LARGE },
  { slug: "iphone-se", name: "iPhone SE (3rd generation, 2nd generation)", group: HOME_MEDIUM },

  { slug: "ipad-pro-13", name: "iPad Pro (M5, M4)", group: IPAD_13 },
  { slug: "ipad-air-13", name: "iPad Air (M4, M3, M2)", group: IPAD_13 },
  { slug: "ipad-pro-11", name: "iPad Pro (M5, M4)", group: IPAD_11 },
  { slug: "ipad-air-11", name: "iPad Air (M4, M3, M2)", group: IPAD_11 },
  { slug: "ipad-a16", name: "iPad (A16)", group: IPAD_11 },
  { slug: "ipad-mini", name: "iPad mini (A17 Pro)", group: IPAD_11 },

  { slug: "mac", name: "Mac", group: MAC },
  { slug: "apple-tv", name: "Apple TV", group: APPLE_TV },
  { slug: "apple-vision-pro", name: "Apple Vision Pro", group: APPLE_VISION },
  { slug: "apple-watch", name: "Apple Watch", group: APPLE_WATCH },
];

/** Popular fallbacks so single-device groups still get 2-4 resolvable neighbors. */
const FALLBACK_NEIGHBORS: Record<Platform, string[]> = {
  iphone: ["iphone-16-pro", "iphone-16-pro-max", "iphone-15", "iphone-16"],
  ipad: ["ipad-pro-13", "ipad-air-13", "ipad-pro-11", "ipad-mini"],
  mac: ["mac", "apple-tv", "apple-vision-pro", "apple-watch"],
  tv: ["mac", "apple-tv", "apple-vision-pro", "apple-watch"],
  vision: ["mac", "apple-tv", "apple-vision-pro", "apple-watch"],
  watch: ["mac", "apple-tv", "apple-vision-pro", "apple-watch"],
};

function neighborsFor(entry: Entry): string[] {
  const siblings = ENTRIES.filter((other) => other.group === entry.group && other.slug !== entry.slug).map((other) => other.slug);
  const candidates = [...siblings, ...FALLBACK_NEIGHBORS[entry.group.platform]];
  const picked: string[] = [];
  for (const slug of candidates) {
    if (slug !== entry.slug && !picked.includes(slug)) picked.push(slug);
    if (picked.length === 4) break;
  }
  return picked;
}

export const DEVICES: Device[] = ENTRIES.map((entry) => ({
  slug: entry.slug,
  name: entry.name,
  displaySize: entry.displaySize ?? entry.group.displaySize,
  platform: entry.group.platform,
  group: entry.group.group,
  sizes: entry.group.sizes,
  requirement: entry.group.requirement,
  commonErrors: { fr: [...entry.group.errors.fr], en: [...entry.group.errors.en] },
  neighbors: neighborsFor(entry),
  generatorSize: entry.group.generatorSize,
  toolPath: entry.group.generatorSize ? undefined : true,
}));

export const DEVICE_SLUGS: string[] = DEVICES.map((device) => device.slug);

export function deviceBySlug(slug: string): Device | undefined {
  return DEVICES.find((device) => device.slug === slug);
}

/** Display name used in headings and links; appends the display size when Apple names collide. */
export function deviceDisplayName(device: Device): string {
  return device.displaySize ? `${device.name} ${device.displaySize}` : device.name;
}

export const PLATFORM_LABEL: Record<Platform, LocalizedText> = {
  iphone: { fr: "iPhone", en: "iPhone" },
  ipad: { fr: "iPad", en: "iPad" },
  mac: { fr: "Mac", en: "Mac" },
  tv: { fr: "Apple TV", en: "Apple TV" },
  vision: { fr: "Apple Vision Pro", en: "Apple Vision Pro" },
  watch: { fr: "Apple Watch", en: "Apple Watch" },
};

export const PLATFORM_ORDER: Platform[] = ["iphone", "ipad", "mac", "tv", "vision", "watch"];

export function devicesByPlatform(locale: Locale): { platform: Platform; label: string; devices: Device[] }[] {
  return PLATFORM_ORDER.map((platform) => ({
    platform,
    label: PLATFORM_LABEL[platform][locale],
    devices: DEVICES.filter((device) => device.platform === platform),
  })).filter((group) => group.devices.length > 0);
}
