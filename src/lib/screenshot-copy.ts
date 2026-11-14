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
    { q: "Which iPhone screenshot size is required for App Store Connect?", a: "iPhone with Dynamic Island (medium display, 6.3\") required: 1206 × 2622 pixels in portrait or 2622 × 1206 in landscape. App Store Connect also accepts 1179 × 2556 or 2556 × 1179. DuoShot exports 1206 × 2622 (or its landscape), included in the free trial. Apple's \"Required device sizes\" list doesn't name the 6.9″ (large display) slot, but the Face ID (large display) row reads \"Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided\"; DuoShot exports it with Pass, Indie and Studio." },
    { q: "What is the iPhone Duo outer display screenshot size?", a: `Use ${OUTER_PORTRAIT} pixels in portrait for the outer display. These are the App Store Connect screenshot dimensions.` },
    { q: "What is the iPhone Duo inner display screenshot size?", a: `Use ${INNER_PORTRAIT} pixels in portrait for the inner display. Prepare a capture that represents your app on this display.` },
    { q: "What dimensions should landscape screenshots use?", a: `Outer display: ${OUTER_LANDSCAPE} pixels. Inner display: ${INNER_LANDSCAPE} pixels. DuoShot exports one orientation per set; prepare a separate set if you also need the other orientation.` },
    { q: "Can I upload iPhone Duo screenshots to App Store Connect now?", a: appleUploadStatus("en") },
    { q: "Does App Store Connect accept PNG, JPEG, or an alpha channel?", a: "Apple accepts PNG and JPEG screenshots, with no alpha channel or transparency. DuoShot exports opaque RGB PNG by default, with JPEG available as an option. Apple allows one to ten screenshots; DuoShot’s suggestion to use at least three is editorial advice." },
    { q: "Why is the inner panel resolution different from the screenshot size?", a: `Apple lists 1878 × 2670 pixels for the physical inner display and ${INNER_PORTRAIT} pixels for a portrait App Store Connect screenshot. These describe different things: use the Connect dimensions when preparing listing assets. Resizing a file does not create an adapted inner-display layout.` },
    { q: "What is the iPhone Duo screenshot size?", a: `${OUTER_PORTRAIT} px for the outer display and ${INNER_PORTRAIT} px for the inner display in portrait (${OUTER_LANDSCAPE} and ${INNER_LANDSCAPE} in landscape), per Apple’s Screenshot specifications. 1 to 10 screenshots per device size, .png, .jpg or .jpeg, no alpha channel.` },
    { q: "Do iPhone Duo screenshots add a badge on the App Store?", a: "Yes. Apple says that when you submit iPhone Duo screenshots in App Store Connect, your App Store product page displays a badge to let people know your app is made for iPhone Duo." },
  ],
  fr: [
    { q: "Quelle taille de captures iPhone est requise pour App Store Connect ?", a: "iPhone Dynamic Island (écran moyen, 6,3″) requis : 1206 × 2622 pixels en portrait ou 2622 × 1206 en paysage. App Store Connect accepte aussi 1179 × 2556 ou 2556 × 1179. DuoShot exporte en 1206 × 2622 (ou son paysage), inclus dans l’essai gratuit. La liste « Required device sizes » d’Apple ne cite pas l’emplacement 6,9″ (large display), mais la ligne Face ID (large display) indique « Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided » ; DuoShot l’exporte avec Pass, Indie et Studio." },
    { q: "Quelle taille pour les captures de l’écran externe de l’iPhone Duo ?", a: `Utilisez ${OUTER_PORTRAIT} pixels en portrait pour l’écran externe. Ce sont les dimensions des captures pour App Store Connect.` },
    { q: "Quelle taille pour les captures de l’écran interne de l’iPhone Duo ?", a: `Utilisez ${INNER_PORTRAIT} pixels en portrait pour l’écran interne. Préparez une capture qui représente votre app sur cet écran.` },
    { q: "Quelles dimensions utiliser en paysage ?", a: `Écran externe : ${OUTER_LANDSCAPE} pixels. Écran interne : ${INNER_LANDSCAPE} pixels. DuoShot exporte une orientation par set ; préparez un autre set si vous avez aussi besoin de l’autre orientation.` },
    { q: "Peut-on déjà déposer les captures iPhone Duo dans App Store Connect ?", a: appleUploadStatus("fr") },
    { q: "App Store Connect accepte-t-il le PNG, le JPEG ou un canal alpha ?", a: "Apple accepte les captures PNG et JPEG, sans canal alpha ni transparence. DuoShot exporte du PNG RGB opaque par défaut et propose le JPEG en option. Apple autorise une à dix captures ; le conseil de DuoShot d’en utiliser au moins trois est éditorial." },
    { q: "Pourquoi la résolution de la dalle interne diffère-t-elle de la taille des captures ?", a: `Apple indique 1878 × 2670 pixels pour la dalle interne et ${INNER_PORTRAIT} pixels pour une capture App Store Connect en portrait. Ces valeurs décrivent des choses différentes : utilisez les dimensions Connect pour préparer votre fiche. Redimensionner un fichier ne crée pas une interface adaptée à l’écran interne.` },
    { q: "Quelle est la taille des captures iPhone Duo ?", a: `${OUTER_PORTRAIT} px pour l’écran externe et ${INNER_PORTRAIT} px pour l’écran interne en portrait (${OUTER_LANDSCAPE} et ${INNER_LANDSCAPE} en paysage), selon les Screenshot specifications d’Apple. 1 à 10 captures par taille d’appareil, en .png, .jpg ou .jpeg, sans canal alpha.` },
    { q: "Les captures iPhone Duo ajoutent-elles un badge sur l’App Store ?", a: "Oui. Apple indique que lorsque vous déposez des captures iPhone Duo dans App Store Connect, votre page produit App Store affiche un badge indiquant que votre app est conçue pour l’iPhone Duo." },
  ],
};
