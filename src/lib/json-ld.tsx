import { FAQ } from "./i18n";
import { SITE_NAME, SITE_PITCH_EN, SITE_PITCH_FR, getSiteUrl } from "./site";
import type { Locale } from "./specs";

export function jsonLdGraph(locale: Locale) {
  const faq = FAQ[locale];
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url,
        description: SITE_PITCH_FR,
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "49",
          priceCurrency: "EUR",
        },
        description: locale === "fr" ? SITE_PITCH_FR : SITE_PITCH_EN,
        url,
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

export function JsonLd({ locale }: { locale: Locale }) {
  const json = JSON.stringify(jsonLdGraph(locale));
  return (
    <script
      type="application/ld+json"
      // JSON-LD is serialized by JSON.stringify from our own constants.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
