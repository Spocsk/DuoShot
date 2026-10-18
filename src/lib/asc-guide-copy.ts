import type { Locale } from "./specs";

/** Shared by the visible instructions/FAQ and their structured data. */
export function ascGuideCopy(locale: Locale) {
  return locale === "fr" ? {
    howToHeading: "Déposer manuellement les captures iPhone Duo",
    faqHeading: "Questions sur le dépôt des captures",
    steps: [
      { id: "prepare", name: "Préparer la sélection Duo", text: "Dans DuoShot, importez vos captures réelles. Choisissez l’externe, l’interne ou un mélange, jusqu’à 10 captures au total (limite DuoShot). Apple autorise jusqu’à 10 captures par taille d’appareil. Vérifiez le cadrage, la lisibilité près du pli et l’absence de transparence." },
      { id: "unzip", name: "Exporter et décompresser le ZIP", text: "Téléchargez le ZIP HD et décompressez-le. Vérifiez les fichiers PNG/JPEG opaques et leur ordre : 1398 × 2034 pour l’externe, 2007 × 2853 pour l’interne en portrait. Inversez les dimensions en paysage. duo-slot.json indique l’ordre de dépôt." },
      { id: "listing", name: "Choisir l’app, la version et la langue", text: "Dans App Store Connect, ouvrez Apps et sélectionnez votre app, puis une version iOS modifiable dans la barre latérale. Choisissez la langue de la fiche dans le menu en haut à droite." },
      { id: "duo-slot", name: "Déposer les captures iPhone Duo", text: "Dans les informations de la page produit, ouvrez la section des aperçus et captures d’écran, puis toutes les tailles dans le gestionnaire de médias (View All Sizes in Media Manager). Choisissez iPhone, puis iPhone Duo. Déposez les images décompressées dans l’ordre souhaité. Comptez les captures déjà présentes : Apple autorise jusqu’à 10 captures par taille d’appareil." },
      { id: "iphone-slots", name: "Ajouter les autres formats dans leurs emplacements", text: "Déposez les captures 6,3″ requises (1206 × 2622 en portrait) dans l’emplacement iPhone Dynamic Island (écran moyen, 6,3″) requis, inclus dans l’essai gratuit. Si vous avez exporté le 1320 × 2868 optionnel avec Pass, Indie ou Studio, utilisez l’emplacement iPhone 6,9″. Inversez les dimensions pour les fichiers en paysage." },
      { id: "review", name: "Vérifier la fiche avant soumission", text: "Vérifiez l’ordre, la langue, les dimensions et le contenu des captures dans la fiche, puis enregistrez les modifications. Répétez pour chaque langue avant soumission. Si App Store Connect refuse les dimensions, contrôlez l’emplacement et l’orientation ; si le fichier contient un canal alpha, utilisez un PNG/JPEG opaque. DuoShot n’a pas encore testé le dépôt Duo et ne garantit pas l’approbation d’Apple." },
    ],
    faq: [
      { q: "Où déposer les captures des écrans Duo ?", a: "Dans App Store Connect, choisissez iPhone, puis iPhone Duo. Apple autorise jusqu’à 10 captures par taille d’appareil. Les deux tailles sont acceptées : 1398 × 2034 et 2007 × 2853, ou leurs dimensions en paysage. Le dépôt n’a pas encore été testé par DuoShot." },
      { q: "Quand les captures iPhone Duo seront-elles obligatoires ?", a: "Apple les exige à partir d’avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur. Apple autorise jusqu’à 10 captures par taille d’appareil, avec les variantes paysage." },
      { q: "Les captures Duo remplacent-elles les captures 6,3″ requises ?", a: "Non. Les captures 6,3″ requises utilisent leur propre emplacement : 1206 × 2622 en portrait, dimensions inversées en paysage. DuoShot les inclut dans l’essai gratuit de 2 ZIP HD. Le format 6,9″ 1320 × 2868 est optionnel et disponible avec Pass, Indie et Studio." },
      { q: "Le dépôt automatique DuoShot a-t-il été testé ?", a: "Non. Le connecteur App Store Connect est expérimental ; DuoShot n’a pas encore vérifié de bout en bout le dépôt Duo. Utilisez le ZIP pour un dépôt manuel et vérifiez les fichiers dans la fiche de votre app." },
      { q: "Pourquoi App Store Connect refuse-t-il un fichier ?", a: "Vérifiez les dimensions, l’orientation et la taille d’appareil choisie. Les captures doivent être des fichiers PNG ou JPEG opaques, sans canal alpha. Apple autorise jusqu’à 10 captures par taille d’appareil, captures déjà présentes comprises." },
    ],
  } : {
    howToHeading: "Upload iPhone Duo screenshots manually",
    faqHeading: "Screenshot upload questions",
    steps: [
      { id: "prepare", name: "Prepare the Duo selection", text: "Import your real captures into DuoShot. Choose outer, inner, or a mix, up to 10 screenshots in total (DuoShot limit). Apple allows up to 10 screenshots per device size. Check cropping, readability near the fold and the absence of transparency." },
      { id: "unzip", name: "Export and unzip the archive", text: "Download the HD ZIP and unzip it. Check the opaque PNG/JPEG files and their order: 1398 × 2034 for outer, 2007 × 2853 for inner in portrait. Swap dimensions for landscape. duo-slot.json records upload order." },
      { id: "listing", name: "Choose the app, version and language", text: "In App Store Connect, open Apps and select your app, then an editable iOS version in the sidebar. Choose the listing language from the menu at the top right." },
      { id: "duo-slot", name: "Upload iPhone Duo screenshots", text: "Under Product Page Information, open App Previews and Screenshots, then View All Sizes in Media Manager. Choose iPhone, then iPhone Duo. Drop the unzipped images in your chosen order. Count existing screenshots: Apple allows up to 10 screenshots per device size." },
      { id: "iphone-slots", name: "Add the other formats to their own slots", text: "Upload the required 6.3\" screenshots (1206 × 2622 in portrait) to the iPhone with Dynamic Island (medium display, 6.3\") required slot, included in the free trial. If you exported the optional 1320 × 2868 size with Pass, Indie or Studio, use the 6.9″ iPhone slot. Swap dimensions for landscape files." },
      { id: "review", name: "Review the listing before submission", text: "Check screenshot order, language, dimensions and content in the listing, then save your changes. Repeat for each listing language before submitting. If App Store Connect rejects the dimensions, check the slot and orientation; if a file has an alpha channel, use an opaque PNG/JPEG. DuoShot has not yet tested Duo uploads and does not guarantee Apple approval." },
    ],
    faq: [
      { q: "Where should I upload Duo screen captures?", a: "In App Store Connect, choose iPhone, then iPhone Duo. Apple allows up to 10 screenshots per device size. Both sizes are accepted: 1398 × 2034 and 2007 × 2853, or their landscape dimensions. Uploads have not yet been tested by DuoShot." },
      { q: "When do iPhone Duo screenshots become mandatory?", a: "Apple requires them from April 2027 for apps built with the iOS 27.1 SDK or later. Apple allows up to 10 screenshots per device size, including landscape variants." },
      { q: "Do Duo screenshots replace the required 6.3\" screenshots?", a: "No. The required 6.3\" screenshots use their own slot: 1206 × 2622 in portrait, with dimensions swapped for landscape. DuoShot includes them in the free trial of 2 HD ZIPs. The 6.9″ 1320 × 2868 format is optional and available with Pass, Indie and Studio." },
      { q: "Has DuoShot’s automatic upload been tested?", a: "No. The App Store Connect connector is experimental; DuoShot has not yet verified Duo uploads end to end. Use the ZIP for manual upload and check the files in your app’s listing." },
      { q: "Why does App Store Connect reject a file?", a: "Check dimensions, orientation and the chosen device size. Screenshots must be opaque PNG or JPEG files without an alpha channel. Apple allows up to 10 screenshots per device size, including existing screenshots." },
    ],
  };
}
