import type { Locale } from "./specs";

export const APPLE_SCREENSHOT_SOURCE = "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/";
export const DUO_SLOT_SOURCE = "https://github.com/rorkai/App-Store-Connect-CLI/blob/main/docs/design/iphone-duo-screenshots.md";
export const APPLE_DEVICE_SOURCE = "https://www.apple.com/iphone-duo/specs/";
export const APPLE_UPLOAD_NEWS_SOURCE = "https://developer.apple.com/news/?id=kkphp5qo";
export const APPLE_UPLOAD_STATUS_CHECKED_AT = "2026-10-13";

export type AppleUploadState = "pending" | "open";
/** Compatibility state for the availability component; contract remains untested by us. */
export const APPLE_UPLOAD_STATE: AppleUploadState = "open";

const COPY: Record<AppleUploadState, Record<Locale, (date: string) => string>> = {
  pending: {
    fr: (date) => `Vérifié le ${date} : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année. Préparez vos fichiers dès maintenant ; le dépôt dans App Store Connect sera manuel.`,
    en: (date) => `Checked ${date}: Apple says Duo screenshot uploads will open later this year. Prepare your files now; upload to App Store Connect will be manual.`,
  },
  open: {
    fr: (date) => `Vérifié le ${date} : le dépôt des captures d’écran iPhone Duo est ouvert dans App Store Connect depuis le 5 octobre 2026. Ces captures seront exigées pour toute soumission à partir d’avril 2027. Déposez manuellement les captures sélectionnées depuis la fiche de votre app.`,
    en: (date) => `Checked ${date}: iPhone Duo screenshot uploads have been open in App Store Connect since October 5, 2026. Duo screenshots become required for every submission from April 2027. Upload your selected screenshots manually from your app’s listing.`,
  },
};

export const DUO_SLOT_COPY: Record<Locale, string> = {
  "en": "App Store Connect has one iPhone Duo slot (APP_IPHONE_DUO), with at most 10 screenshots per locale across outer and inner screens. Both sizes are accepted: 1398 × 2034 and 2007 × 2853, or their landscape dimensions. Uploads have not yet been tested by DuoShot.",
  "fr": "App Store Connect propose un emplacement iPhone Duo unique (APP_IPHONE_DUO), avec 10 captures maximum par langue, externe et interne confondus. Les deux tailles sont acceptées : 1398 × 2034 et 2007 × 2853, ou leurs dimensions en paysage. Le dépôt n’a pas encore été testé par DuoShot."
};

export function appleUploadStatus(locale: Locale, state: AppleUploadState = APPLE_UPLOAD_STATE): string {
  const date = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${APPLE_UPLOAD_STATUS_CHECKED_AT}T00:00:00Z`));
  return `${COPY[state][locale](date)} ${DUO_SLOT_COPY[locale]}`;
}
