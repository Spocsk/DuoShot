import type { Locale } from "./specs";
import type { ScreenshotSize } from "./screenshot-pages";

/*
 * Per-size, per-locale enrichment rendered by SizePage alongside the FAQ: the devices an App Store
 * Connect slot covers, the portrait/landscape orientation, and the rejection causes to rule out.
 * Every fact is grounded in the repo's Apple source of truth (developer.apple.com screenshot
 * specifications): the Dynamic Island medium/large display device groups and their accepted sizes,
 * and the iPhone Duo outer/inner screenshot sizes with the no-alpha, PNG-or-JPEG file rules. The
 * copy never claims both Duo sizes are required and never says the App Store Connect upload is
 * tested. See also the visible FAQ in size-faq.ts.
 */

export type SizeEnrichment = {
  devices: { heading: string; body: string };
  orientation: { heading: string; body: string };
  rejections: { heading: string; intro: string; items: string[] };
};

const HEADINGS = {
  fr: { devices: "Appareils concernés", orientation: "Orientation : portrait ou paysage", rejections: "Erreurs de rejet fréquentes" },
  en: { devices: "Supported devices", orientation: "Orientation: portrait or landscape", rejections: "Common rejection errors" },
} as const;

function enrichment(
  locale: Locale,
  devicesBody: string,
  orientationBody: string,
  rejectionsIntro: string,
  rejectionsItems: string[],
): SizeEnrichment {
  const h = HEADINGS[locale];
  return {
    devices: { heading: h.devices, body: devicesBody },
    orientation: { heading: h.orientation, body: orientationBody },
    rejections: { heading: h.rejections, intro: rejectionsIntro, items: rejectionsItems },
  };
}

const SIZE_ENRICHMENT: Record<ScreenshotSize, Record<Locale, SizeEnrichment>> = {
  "1206x2622": {
    fr: enrichment("fr",
      "Cette taille vise le groupe « iPhone with Dynamic Island (medium display) » d’App Store Connect : iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15 et 14 Pro. Le groupe accepte 1206 × 2622 ou 1179 × 2556 pixels en portrait (et leurs paysages). Si vous n’ajoutez pas ces captures, App Store Connect met à l’échelle celles du grand écran.",
      "En portrait, exportez 1206 × 2622 pixels ; en paysage, 2622 × 1206 pixels. Gardez une orientation cohérente sur toute la série de captures de cet emplacement.",
      "Avant de déposer vos captures 1206 × 2622, écartez ces causes fréquentes de rejet :",
      [
        "Mauvaise taille : déposez exactement 1206 × 2622 pixels en portrait (ou 2622 × 1206 en paysage). Une image à une autre résolution est refusée.",
        "Transparence ou canal alpha : aplatissez le fond. Les images ne peuvent pas comporter de canal alpha ni de zones transparentes.",
        "Mauvais format : exportez en PNG ou JPEG. Les autres formats (HEIC, WebP, PDF…) sont rejetés.",
      ]),
    en: enrichment("en",
      "This size targets App Store Connect’s “iPhone with Dynamic Island (medium display)” group: iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15 and 14 Pro. The group accepts 1206 × 2622 or 1179 × 2556 pixels in portrait (and their landscapes). If you don’t add these screenshots, App Store Connect scales the large-display ones.",
      "In portrait, export 1206 × 2622 pixels; in landscape, 2622 × 1206 pixels. Keep one consistent orientation across the whole set for this slot.",
      "Before you upload your 1206 × 2622 screenshots, rule out these common rejection causes:",
      [
        "Wrong size: upload exactly 1206 × 2622 pixels in portrait (or 2622 × 1206 in landscape). An image at any other resolution is rejected.",
        "Transparency or alpha channel: flatten the background. Images can’t include an alpha channel or transparent areas.",
        "Wrong format: export PNG or JPEG. Other formats (HEIC, WebP, PDF…) are rejected.",
      ]),
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
      "Cette taille correspond à l’écran externe de l’iPhone Duo, le téléphone pliable d’Apple (fermé). À partir d’avril 2027, les captures iPhone Duo sont requises pour les apps compilées avec le SDK iOS 27.1 ou ultérieur ; déposer des captures Duo affiche le badge « optimisé pour iPhone Duo ».",
      "En portrait, exportez 1398 × 2034 pixels ; en paysage, 2034 × 1398 pixels. Montrez votre app sur l’écran externe fermé.",
      "Les captures de l’écran externe sont souvent rejetées pour ces raisons :",
      [
        "Mauvaise taille : déposez 1398 × 2034 pixels en portrait (ou 2034 × 1398 en paysage) pour l’écran externe. D’autres dimensions sont refusées.",
        "Transparence ou canal alpha : les images ne peuvent pas comporter de canal alpha ni de transparence. Exportez un fond plein.",
        "Mauvais format : utilisez le PNG ou le JPEG ; les autres formats sont rejetés.",
      ]),
    en: enrichment("en",
      "This size is the outer display of the iPhone Duo, Apple’s foldable iPhone (closed). From April 2027, iPhone Duo screenshots are required for apps built with the iOS 27.1 SDK or later; submitting Duo screenshots shows an “optimized for iPhone Duo” badge.",
      "In portrait, export 1398 × 2034 pixels; in landscape, 2034 × 1398 pixels. Show your app on the closed outer display.",
      "Outer-display screenshots are often rejected for these reasons:",
      [
        "Wrong size: upload 1398 × 2034 pixels in portrait (or 2034 × 1398 in landscape) for the outer display. Other dimensions are rejected.",
        "Transparency or alpha channel: images can’t include an alpha channel or transparency. Export a solid background.",
        "Wrong format: use PNG or JPEG; other formats are rejected.",
      ]),
  },
  "2007x2853": {
    fr: enrichment("fr",
      "Cette taille correspond à l’écran interne de l’iPhone Duo (ouvert). À partir d’avril 2027, les captures iPhone Duo sont requises pour les apps compilées avec le SDK iOS 27.1 ou ultérieur ; déposer des captures Duo affiche le badge « optimisé pour iPhone Duo ».",
      "En portrait, exportez 2007 × 2853 pixels ; en paysage, 2853 × 2007 pixels. Montrez l’interface déployée de votre app sur l’écran interne.",
      "Pour l’écran interne, surveillez ces causes fréquentes de rejet :",
      [
        "Mauvaise taille : déposez 2007 × 2853 pixels en portrait (ou 2853 × 2007 en paysage), la taille de capture App Store Connect pour l’écran interne. D’autres dimensions sont refusées.",
        "Transparence ou canal alpha : aplatissez le fond ; aucun canal alpha ni transparence n’est accepté.",
        "Mauvais format : exportez en PNG ou JPEG uniquement.",
      ]),
    en: enrichment("en",
      "This size is the inner display of the iPhone Duo (open). From April 2027, iPhone Duo screenshots are required for apps built with the iOS 27.1 SDK or later; submitting Duo screenshots shows an “optimized for iPhone Duo” badge.",
      "In portrait, export 2007 × 2853 pixels; in landscape, 2853 × 2007 pixels. Show your app’s expanded layout on the inner display.",
      "For the inner display, watch for these common rejection causes:",
      [
        "Wrong size: upload 2007 × 2853 pixels in portrait (or 2853 × 2007 in landscape), the App Store Connect screenshot size for the inner display. Other dimensions are rejected.",
        "Transparency or alpha channel: flatten the background; no alpha channel or transparency is accepted.",
        "Wrong format: export PNG or JPEG only.",
      ]),
  },
};

export function sizeEnrichment(locale: Locale, size: ScreenshotSize): SizeEnrichment {
  return SIZE_ENRICHMENT[size][locale];
}
