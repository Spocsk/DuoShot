import type { Locale } from "./specs";

/** Shared by the visible FAQ and its structured data. Figures come from Apple's creative assets specifications (checked 2026-11-11). */
export function creativeAssetsGuideCopy(locale: Locale) {
  return locale === "fr" ? {
    faqHeading: "Questions fréquentes sur les creative assets",
    faq: [
      { q: "Les creative assets sont-ils obligatoires ?", a: "Non. Apple les décrit comme facultatifs et distincts de vos captures et de vos aperçus." },
      { q: "Quelle est la taille du bandeau de fiche App Store ?", a: "3840 × 1646 pixels (21:9) pour une image ou une vidéo, ou 5244 × 2950 pixels (16:9, PNG) pour un visuel universel." },
      { q: "Quelle est la taille du visuel des résultats de recherche App Store ?", a: "En 3:2, de 1920 × 1280 jusqu’à 3840 × 2560 pixels." },
      { q: "Faut-il une nouvelle version de l’app pour les changer ?", a: "Non. Si votre version est en ligne, vous pouvez publier un creative asset approuvé depuis l’Asset Library sans nouvelle soumission." },
      { q: "Quelles versions d’iOS les affichent ?", a: "iOS 27 et iPadOS 27 et versions ultérieures." },
    ],
  } : {
    faqHeading: "Creative assets FAQ",
    faq: [
      { q: "Are creative assets required?", a: "No. Apple describes them as optional and separate from your screenshots and app previews." },
      { q: "What size is the App Store product page header?", a: "3840 × 1646 pixels (21:9) for an image or video, or 5244 × 2950 pixels (16:9, PNG) for a universal asset." },
      { q: "What size is the App Store search results image?", a: "3:2, from 1920 × 1280 up to 3840 × 2560 pixels." },
      { q: "Do I need a new app version to change them?", a: "No. If your version is live, you can publish an approved creative asset from Asset Library without a new submission." },
      { q: "Which iOS versions show them?", a: "iOS 27 and iPadOS 27 and later." },
    ],
  };
}
