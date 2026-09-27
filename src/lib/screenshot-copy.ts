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
    { q: "What is the iPhone Duo outer display screenshot size?", a: `Use ${OUTER_PORTRAIT} pixels in portrait for the 5.4″ outer display. These are the App Store Connect screenshot dimensions.` },
    { q: "What is the iPhone Duo inner display screenshot size?", a: `Use ${INNER_PORTRAIT} pixels in portrait for the 7.6″ inner display. Prepare a capture that represents your app on this display.` },
    { q: "What dimensions should landscape screenshots use?", a: `Outer display: ${OUTER_LANDSCAPE} pixels. Inner display: ${INNER_LANDSCAPE} pixels. DuoShot exports one orientation per set; prepare a separate set if you also need the other orientation.` },
    { q: "Can I upload iPhone Duo screenshots to App Store Connect now?", a: appleUploadStatus("en") },
    { q: "Does App Store Connect accept PNG, JPEG, or an alpha channel?", a: "Apple accepts PNG and JPEG screenshots, with no alpha channel or transparency. DuoShot exports opaque RGB PNG by default, with JPEG available as an option. Apple allows one to ten screenshots; DuoShot’s suggestion to use at least three is editorial advice." },
    { q: "Why is the inner panel resolution different from the screenshot size?", a: `Apple lists 1878 × 2670 pixels for the physical inner display and ${INNER_PORTRAIT} pixels for a portrait App Store Connect screenshot. These describe different things: use the Connect dimensions when preparing listing assets. Resizing a file does not create an adapted inner-display layout.` },
  ],
  fr: [
    { q: "Quelle taille pour les captures de l’écran externe de l’iPhone Duo ?", a: `Utilisez ${OUTER_PORTRAIT} pixels en portrait pour l’écran externe de 5,4″. Ce sont les dimensions des captures pour App Store Connect.` },
    { q: "Quelle taille pour les captures de l’écran interne de l’iPhone Duo ?", a: `Utilisez ${INNER_PORTRAIT} pixels en portrait pour l’écran interne de 7,6″. Préparez une capture qui représente votre app sur cet écran.` },
    { q: "Quelles dimensions utiliser en paysage ?", a: `Écran externe : ${OUTER_LANDSCAPE} pixels. Écran interne : ${INNER_LANDSCAPE} pixels. DuoShot exporte une orientation par set ; préparez un autre set si vous avez aussi besoin de l’autre orientation.` },
    { q: "Peut-on déjà déposer les captures iPhone Duo dans App Store Connect ?", a: appleUploadStatus("fr") },
    { q: "App Store Connect accepte-t-il le PNG, le JPEG ou un canal alpha ?", a: "Apple accepte les captures PNG et JPEG, sans canal alpha ni transparence. DuoShot exporte du PNG RGB opaque par défaut et propose le JPEG en option. Apple autorise une à dix captures ; le conseil de DuoShot d’en utiliser au moins trois est éditorial." },
    { q: "Pourquoi la résolution de la dalle interne diffère-t-elle de la taille des captures ?", a: `Apple indique 1878 × 2670 pixels pour la dalle interne et ${INNER_PORTRAIT} pixels pour une capture App Store Connect en portrait. Ces valeurs décrivent des choses différentes : utilisez les dimensions Connect pour préparer votre fiche. Redimensionner un fichier ne crée pas une interface adaptée à l’écran interne.` },
  ],
};
