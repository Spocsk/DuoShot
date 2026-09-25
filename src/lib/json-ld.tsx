import { CHECKOUT_CATALOG } from "./plans";
import { FAQ } from "./i18n";
import { SITE_DESCRIPTOR, SITE_NAME, SITE_PITCH_EN, SITE_PITCH_FR, getSiteUrl } from "./site";
import type { Locale } from "./specs";

export function jsonLdGraph(locale: Locale) {
  const faq = FAQ[locale];
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
        url,
        description: locale === "fr" ? SITE_PITCH_FR : SITE_PITCH_EN,
      },
      {
        "@type": "SoftwareApplication",
        name: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: [
          { "@type": "Offer", name: "2 trial ZIP exports", price: "0", priceCurrency: "EUR" },
          ...Object.entries(CHECKOUT_CATALOG).map(([kind, offer]) => ({
            "@type": "Offer", name: offer.name, url: `${url}${locale === "en" ? "/en" : ""}/pricing`,
            price: String(offer.amountCents / 100), priceCurrency: "EUR",
            priceSpecification: { "@type": "UnitPriceSpecification", price: String(offer.amountCents / 100), priceCurrency: "EUR", billingDuration: kind.endsWith("yearly") ? "P1Y" : "P1M" },
          })),
        ],
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
