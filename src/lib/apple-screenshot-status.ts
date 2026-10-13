import type { Locale } from "./specs";

export const APPLE_SCREENSHOT_SOURCE = "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/";
export const APPLE_DEVICE_SOURCE = "https://www.apple.com/iphone-duo/specs/";
export const APPLE_UPLOAD_NEWS_SOURCE = "https://developer.apple.com/news/?id=kkphp5qo";
export const APPLE_UPLOAD_STATUS_CHECKED_AT = "2026-10-13";

export type AppleUploadState = "pending" | "open";
/** Switch to "open" (and update CHECKED_AT) once Apple accepts Duo screenshots. */
export const APPLE_UPLOAD_STATE: AppleUploadState = "open";

const COPY: Record<AppleUploadState, Record<Locale, (date: string) => string>> = {
  pending: {
    fr: (date) => `Vérifié le ${date} : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année. Préparez vos fichiers dès maintenant ; le dépôt dans App Store Connect sera manuel.`,
    en: (date) => `Checked ${date}: Apple says Duo screenshot uploads will open later this year. Prepare your files now; upload to App Store Connect will be manual.`,
  },
  open: {
    fr: (date) => `Vérifié le ${date} : le dépôt des captures d’écran iPhone Duo est ouvert dans App Store Connect depuis le 5 octobre 2026. Ces captures seront exigées pour toute soumission à partir d’avril 2027. Déposez manuellement vos captures écran fermé et écran ouvert depuis la fiche de votre app.`,
    en: (date) => `Checked ${date}: iPhone Duo screenshot uploads have been open in App Store Connect since October 5, 2026. Duo screenshots become required for every submission from April 2027. Upload your closed and open screen files manually from your app’s listing.`,
  },
};

export function appleUploadStatus(locale: Locale, state: AppleUploadState = APPLE_UPLOAD_STATE): string {
  const date = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${APPLE_UPLOAD_STATUS_CHECKED_AT}T00:00:00Z`));
  return COPY[state][locale](date);
}
