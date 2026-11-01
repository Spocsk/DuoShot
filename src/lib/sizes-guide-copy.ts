import type { Locale } from "./specs";

/** Shared by the visible FAQ and its structured data. Figures come from Apple's screenshot specifications (checked 2026-11-01). */
export function sizesGuideCopy(locale: Locale) {
  return locale === "fr" ? {
    faqHeading: "Questions fréquentes sur les tailles",
    faq: [
      { q: "Quelle taille de capture App Store est obligatoire pour iPhone ?", a: "App Store Connect exige au moins une capture pour l’iPhone avec Dynamic Island (écran moyen) : 1206 × 2622 ou 1179 × 2556 pixels en portrait, dimensions inversées en paysage. Les autres tailles iPhone sont optionnelles." },
      { q: "Quelles sont les tailles des captures iPhone Duo ?", a: "L’iPhone Duo accepte 1398 × 2034 pixels pour l’écran externe et 2007 × 2853 pixels pour l’écran interne en portrait, ou 2034 × 1398 et 2853 × 2007 en paysage, dans le même emplacement iPhone Duo." },
      { q: "Les captures iPhone Duo sont-elles obligatoires ?", a: "Selon Apple, à partir d’avril 2027, les captures iPhone Duo seront requises pour toute app utilisant le SDK iOS 27.1 ou ultérieur. Quand vous fournissez des captures iPhone Duo, votre page produit affiche un badge indiquant que l’app est optimisée pour l’iPhone Duo." },
      { q: "Quelle taille de capture iPad est requise ?", a: "Si l’app tourne sur iPad, App Store Connect exige l’écran iPad 13″ : 2064 × 2752 ou 2048 × 2732 pixels en portrait. Les tailles 11″ et plus petites sont réduites automatiquement à partir du 13″." },
      { q: "Combien de captures peut-on déposer par taille ?", a: "Apple accepte de 1 à 10 captures par taille d’appareil, en PNG, JPG ou JPEG, sans canal alpha ni transparence." },
      { q: "Pourquoi App Store Connect refuse-t-il ma capture ?", a: "Les causes les plus fréquentes sont des dimensions qui ne correspondent pas exactement à une taille acceptée, un mauvais emplacement d’appareil, ou un PNG avec canal alpha. Exportez un fichier opaque aux dimensions exactes." },
    ],
  } : {
    faqHeading: "Screenshot size FAQ",
    faq: [
      { q: "Which App Store screenshot size is required for iPhone?", a: "App Store Connect requires at least one screenshot for iPhone with Dynamic Island (medium display): 1206 × 2622 or 1179 × 2556 pixels in portrait, with dimensions swapped for landscape. Other iPhone sizes are optional." },
      { q: "What are the iPhone Duo screenshot sizes?", a: "iPhone Duo accepts 1398 × 2034 pixels for the outer display and 2007 × 2853 pixels for the inner display in portrait, or 2034 × 1398 and 2853 × 2007 in landscape, all in the same iPhone Duo slot." },
      { q: "Are iPhone Duo screenshots mandatory?", a: "According to Apple, starting April 2027, iPhone Duo screenshots will be required for any app using the iOS 27.1 SDK or later. When you submit iPhone Duo screenshots, your product page displays a badge showing your app is optimized for iPhone Duo." },
      { q: "Which iPad screenshot size is required?", a: "If the app runs on iPad, App Store Connect requires the iPad 13\" display: 2064 × 2752 or 2048 × 2732 pixels in portrait. The 11\" and smaller sizes are scaled down automatically from the 13\" set." },
      { q: "How many screenshots can I upload per size?", a: "Apple accepts 1 to 10 screenshots per device size, as PNG, JPG or JPEG files without alpha channels or transparency." },
      { q: "Why does App Store Connect reject my screenshot?", a: "The most common causes are dimensions that don't exactly match an accepted size, the wrong device slot, or a PNG with an alpha channel. Export an opaque file at the exact dimensions." },
    ],
  };
}
