import { duoSpec, type Locale, type SizeSpec } from "./specs";
import { appleUploadStatus } from "./apple-screenshot-status";

export function screenshotDimensions(spec: Pick<SizeSpec, "width" | "height">): string {
  return `${spec.width} × ${spec.height}`;
}

export const OUTER_PORTRAIT = screenshotDimensions(duoSpec("duo-outer", "portrait"));
export const INNER_PORTRAIT = screenshotDimensions(duoSpec("duo-inner", "portrait"));
export const OUTER_LANDSCAPE = screenshotDimensions(duoSpec("duo-outer", "landscape"));
export const INNER_LANDSCAPE = screenshotDimensions(duoSpec("duo-inner", "landscape"));

export type FaqItem = { q: string; a: string };

export const SPECS_FAQ: Record<Locale, FaqItem[]> = {
  en: [
    { q: "Which iPhone screenshot size is required for App Store Connect?", a: "iPhone with Dynamic Island (medium display, 6.3\") required: 1206 × 2622 pixels in portrait or 2622 × 1206 in landscape. App Store Connect also accepts 1179 × 2556 or 2556 × 1179. DuoShot exports 1206 × 2622 (or its landscape), included in the free trial. The 6.9″ size is optional, available with Pass, Indie and Studio." },
    { q: "What is the iPhone Duo outer display screenshot size?", a: `Use ${OUTER_PORTRAIT} pixels in portrait for the outer display. These are the App Store Connect screenshot dimensions.` },
    { q: "What is the iPhone Duo inner display screenshot size?", a: `Use ${INNER_PORTRAIT} pixels in portrait for the inner display. Prepare a capture that represents your app on this display.` },
    { q: "What dimensions should landscape screenshots use?", a: `Outer display: ${OUTER_LANDSCAPE} pixels. Inner display: ${INNER_LANDSCAPE} pixels. DuoShot exports one orientation per set; prepare a separate set if you also need the other orientation.` },
    { q: "Can I upload iPhone Duo screenshots to App Store Connect now?", a: appleUploadStatus("en") },
    { q: "Does App Store Connect accept PNG, JPEG, or an alpha channel?", a: "Apple accepts PNG and JPEG screenshots, with no alpha channel or transparency. DuoShot exports opaque RGB PNG by default, with JPEG available as an option. Apple allows one to ten screenshots; DuoShot’s suggestion to use at least three is editorial advice." },
  ],
  fr: [
    { q: "Quelle taille de captures iPhone est requise pour App Store Connect ?", a: "iPhone Dynamic Island (écran moyen, 6,3″) requis : 1206 × 2622 pixels en portrait ou 2622 × 1206 en paysage. App Store Connect accepte aussi 1179 × 2556 ou 2556 × 1179. DuoShot exporte en 1206 × 2622 (ou son paysage), inclus dans l’essai gratuit. La taille 6,9″ est optionnelle, disponible avec Pass, Indie et Studio." },
    { q: "Quelle taille pour les captures de l’écran externe de l’iPhone Duo ?", a: `Utilisez ${OUTER_PORTRAIT} pixels en portrait pour l’écran externe. Ce sont les dimensions des captures pour App Store Connect.` },
    { q: "Quelle taille pour les captures de l’écran interne de l’iPhone Duo ?", a: `Utilisez ${INNER_PORTRAIT} pixels en portrait pour l’écran interne. Préparez une capture qui représente votre app sur cet écran.` },
    { q: "Quelles dimensions utiliser en paysage ?", a: `Écran externe : ${OUTER_LANDSCAPE} pixels. Écran interne : ${INNER_LANDSCAPE} pixels. DuoShot exporte une orientation par set ; préparez un autre set si vous avez aussi besoin de l’autre orientation.` },
    { q: "Peut-on déjà déposer les captures iPhone Duo dans App Store Connect ?", a: appleUploadStatus("fr") },
    { q: "App Store Connect accepte-t-il le PNG, le JPEG ou un canal alpha ?", a: "Apple accepte les captures PNG et JPEG, sans canal alpha ni transparence. DuoShot exporte du PNG RGB opaque par défaut et propose le JPEG en option. Apple autorise une à dix captures ; le conseil de DuoShot d’en utiliser au moins trois est éditorial." },
  ],
};
