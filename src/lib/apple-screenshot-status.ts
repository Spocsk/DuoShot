import type { Locale } from "./specs";

export const APPLE_SCREENSHOT_SOURCE = "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/";
export const APPLE_DEVICE_SOURCE = "https://www.apple.com/iphone-duo/specs/";
export const APPLE_UPLOAD_STATUS_CHECKED_AT = "2026-09-27";

export function appleUploadStatus(locale: Locale): string {
  const date = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${APPLE_UPLOAD_STATUS_CHECKED_AT}T00:00:00Z`));
  return locale === "fr"
    ? `Vérifié le ${date} : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année. Préparez vos fichiers dès maintenant ; le dépôt dans App Store Connect sera manuel.`
    : `Checked ${date}: Apple says Duo screenshot uploads will open later this year. Prepare your files now; upload to App Store Connect will be manual.`;
}
