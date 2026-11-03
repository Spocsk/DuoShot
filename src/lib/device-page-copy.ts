import type { Locale } from "./specs";
import type { Device, DeviceSize } from "./devices";
import { deviceDisplayName, deviceGuidePath, SCREENSHOT_SIZE_HUB } from "./devices";
import type { FaqItem } from "./screenshot-copy";
import { screenshotDimensions } from "./screenshot-copy";

/*
 * Visible copy, FAQ and JSON-LD breadcrumb for the /guides/screenshot-size/<device> pages,
 * all derived from the single source in devices.ts. The FAQ answers reuse the same strings
 * rendered in the page body so the FAQPage JSON-LD matches the visible text exactly.
 */

const VERIFIED_YEAR = "2026";

function joinList(parts: string[], locale: Locale): string {
  if (parts.length <= 1) return parts.join("");
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(", ");
  return `${head} ${locale === "fr" ? "ou" : "or"} ${last}`;
}

const px = (size: DeviceSize) => screenshotDimensions(size);

/** The sentence listing the accepted sizes, grounded in the group's data. */
function sizesSentence(locale: Locale, device: Device): string {
  const group = device.group[locale];
  const lead = locale === "fr"
    ? `App Store Connect accepte ces tailles pour le groupe ${group}`
    : `App Store Connect accepts these sizes for the ${group} group`;

  if (device.platform === "iphone" && device.slug === "iphone-duo") {
    return locale === "fr"
      ? `${lead} : 1398 × 2034 pixels pour l’écran externe et 2007 × 2853 pixels pour l’écran interne en portrait (2034 × 1398 et 2853 × 2007 en paysage).`
      : `${lead}: 1398 × 2034 pixels for the outer display and 2007 × 2853 pixels for the inner display in portrait (2034 × 1398 and 2853 × 2007 in landscape).`;
  }

  if (device.platform === "watch") {
    const list = joinList(device.sizes.map(px), locale);
    return locale === "fr"
      ? `${lead} : ${list} pixels ; utilisez celle qui correspond à votre Apple Watch.`
      : `${lead}: ${list} pixels; use the one that matches your Apple Watch.`;
  }

  if (device.platform === "mac" || device.platform === "tv" || device.platform === "vision") {
    const list = joinList(device.sizes.map(px), locale);
    const ratio = device.platform === "mac" ? (locale === "fr" ? " (paysage 16:10)" : " (16:10 landscape)") : (locale === "fr" ? " (paysage)" : " (landscape)");
    return `${lead}${locale === "fr" ? " : " : ": "}${list} pixels${ratio}.`;
  }

  const portraits = device.sizes.filter((size) => size.orientation === "portrait");
  const list = joinList(portraits.map(px), locale);
  return locale === "fr"
    ? `${lead} : ${list} pixels en portrait (mêmes nombres inversés en paysage).`
    : `${lead}: ${list} pixels in portrait (the same numbers swapped for landscape).`;
}

export function orientationLabel(locale: Locale, orientation: DeviceSize["orientation"]): string {
  if (locale === "fr") return orientation === "portrait" ? "Portrait" : orientation === "landscape" ? "Paysage" : "Autre";
  return orientation === "portrait" ? "Portrait" : orientation === "landscape" ? "Landscape" : "Other";
}

function faqItems(locale: Locale, device: Device, answer: string): FaqItem[] {
  const name = deviceDisplayName(device);
  const items: FaqItem[] = locale === "fr"
    ? [
        { q: `Quelle taille de capture App Store utiliser pour ${name} ?`, a: answer },
        { q: `Les captures pour ${name} sont-elles obligatoires ?`, a: device.requirement.fr },
        { q: "Quel format de fichier et combien de captures puis-je déposer ?", a: "App Store Connect accepte les fichiers PNG, JPG ou JPEG sans canal alpha ni transparence, et jusqu’à 10 captures par taille d’appareil." },
      ]
    : [
        { q: `What App Store screenshot size should I use for ${name}?`, a: answer },
        { q: `Are ${name} screenshots required?`, a: device.requirement.en },
        { q: "Which file format and how many screenshots can I upload?", a: "App Store Connect accepts PNG, JPG or JPEG files with no alpha channel or transparency, and up to 10 screenshots per device size." },
      ];

  if (device.slug === "iphone-duo") {
    items.push(locale === "fr"
      ? { q: "Quand les captures iPhone Duo deviendront-elles obligatoires ?", a: "À partir d’avril 2027, les captures iPhone Duo seront exigées pour toute app utilisant le SDK iOS 27.1 ou ultérieur." }
      : { q: "When will iPhone Duo screenshots become required?", a: "Starting in April 2027, iPhone Duo screenshots will be required for any app using the iOS 27.1 SDK or later." });
  } else if (device.platform === "watch") {
    items.push(locale === "fr"
      ? { q: "Dois-je utiliser la même taille Apple Watch pour chaque langue ?", a: "Oui. Utilisez la même taille de capture Apple Watch de façon cohérente dans toutes les localisations." }
      : { q: "Do I need the same Apple Watch size for every language?", a: "Yes. Use the same Apple Watch screenshot size consistently across all localizations." });
  }
  return items;
}

const HOME_LABEL = { fr: "Accueil", en: "Home" } as const;
const GUIDES_LABEL = { fr: "Guides", en: "Guides" } as const;

export type DevicePageCopy = {
  h1: string;
  title: string;
  description: string;
  answer: string;
  faq: FaqItem[];
  breadcrumb: { name: string; path: string }[];
};

export function devicePageCopy(locale: Locale, device: Device): DevicePageCopy {
  const name = deviceDisplayName(device);
  const answer = sizesSentence(locale, device);
  const h1 = locale === "fr"
    ? `Taille de capture App Store ${name} (${VERIFIED_YEAR})`
    : `App Store screenshot size for ${name} (${VERIFIED_YEAR})`;
  const title = locale === "fr" ? `${h1} | générateur DuoShot` : `${h1} | DuoShot`;
  const description = locale === "fr"
    ? `Taille de capture App Store pour ${name} (${VERIFIED_YEAR}) : tailles acceptées, obligation et erreurs de rejet fréquentes.`
    : `App Store screenshot size for ${name} (${VERIFIED_YEAR}): accepted sizes, requirement and common rejection errors.`;
  return {
    h1,
    title,
    description,
    answer,
    faq: faqItems(locale, device, answer),
    breadcrumb: [
      { name: HOME_LABEL[locale], path: "/" },
      { name: GUIDES_LABEL[locale], path: "/guides" },
      { name: SCREENSHOT_SIZE_HUB.label[locale], path: SCREENSHOT_SIZE_HUB.path },
      { name, path: deviceGuidePath(device.slug) },
    ],
  };
}
