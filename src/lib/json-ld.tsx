import { CHECKOUT_CATALOG, FREE_EXPORTS, PASS30, pass30PriceId } from "./plans";
import { getTranslator } from "./i18n";
import { SITE_DESCRIPTOR, SITE_NAME, SITE_PITCH_EN, SITE_PITCH_FR, absoluteUrl, localizedPath, pricingPath } from "./site";
import type { Locale } from "./specs";
import type { FaqItem } from "./screenshot-copy";
import { APPLE_SCREENSHOT_SOURCE } from "./apple-screenshot-status";
import { pricingPageCopy } from "./marketing-copy";

export type PageSchema = {
  path: string;
  faq?: readonly FaqItem[];
  software?: boolean | { name: string; description: string };
  article?: { title: string; description: string; dateModified: string };
};

export function jsonLdGraph(locale: Locale, { path, faq, software, article }: PageSchema) {
  const url = absoluteUrl(localizedPath(locale, path));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${absoluteUrl("/")}#organization`,
        name: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
        url: absoluteUrl("/"),
        description: locale === "fr" ? SITE_PITCH_FR : SITE_PITCH_EN,
      },
      ...(software ? [{
        "@type": "SoftwareApplication",
        name: typeof software === "object" ? software.name : `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: typeof software === "object" ? [
          { "@type": "Offer", name: software.name, description: software.description, price: "0", priceCurrency: "EUR" },
        ] : [
          { "@type": "Offer", name: `${getTranslator(locale).t("pricing_trial_title")} · ${FREE_EXPORTS} exports`, description: getTranslator(locale).tf("pricing_trial_body", { exports: FREE_EXPORTS }), price: "0", priceCurrency: "EUR" },
          ...Object.entries(CHECKOUT_CATALOG).map(([kind, offer]) => ({
            "@type": "Offer", name: offer.name, url: absoluteUrl(pricingPath(locale)),
            price: String(offer.amountCents / 100), priceCurrency: "EUR",
            priceSpecification: { "@type": "UnitPriceSpecification", price: String(offer.amountCents / 100), priceCurrency: "EUR", billingDuration: kind.endsWith("yearly") ? "P1Y" : "P1M" },
          })),
          ...(pass30PriceId()?.trim() ? [{
            "@type": "Offer",
            name: locale === "fr" ? PASS30.name : "DuoShot 30-day Pass",
            url: absoluteUrl(pricingPath(locale)),
            price: String(PASS30.priceEur),
            priceCurrency: "EUR",
            // One payment grants 30 days of access; this is not a subscription.
            priceSpecification: { "@type": "UnitPriceSpecification", price: String(PASS30.priceEur), priceCurrency: "EUR", billingDuration: `P${PASS30.days}D` },
          }] : []),
        ],
        description: typeof software === "object" ? software.description : localizedPath("fr", path) === "/pricing" ? pricingPageCopy(locale).description : locale === "fr" ? SITE_PITCH_FR : SITE_PITCH_EN,
        url,
      }] : []),
      ...(article ? [{
        "@type": "TechArticle",
        "@id": `${url}#article`,
        url,
        mainEntityOfPage: url,
        headline: article.title,
        description: article.description,
        inLanguage: locale,
        dateModified: article.dateModified,
        author: { "@id": `${absoluteUrl("/")}#organization` },
        citation: APPLE_SCREENSHOT_SOURCE,
      }] : []),
      ...(faq?.length ? [{
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url,
        inLanguage: locale,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }] : []),
    ],
  };
}

export function JsonLd({ locale, ...schema }: { locale: Locale } & PageSchema) {
  const json = JSON.stringify(jsonLdGraph(locale, schema)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
