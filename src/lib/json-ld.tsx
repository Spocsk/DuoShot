import { CHECKOUT_CATALOG, FREE_EXPORTS, PASS30, pass30PriceId } from "./plans";
import { getTranslator } from "./i18n";
import { SITE_DESCRIPTOR, SITE_NAME, SITE_PITCH_EN, SITE_PITCH_FR, SITE_SAME_AS, absoluteUrl, localizedPath, pricingPath } from "./site";
import type { Locale } from "./specs";
import type { FaqItem } from "./screenshot-copy";
import { APPLE_SCREENSHOT_SOURCE } from "./apple-screenshot-status";

/** Named author for articles that carry a `author: "person"` byline. */
export const ARTICLE_AUTHOR = "Dylan Couto de Oliveira";

export type PageSchema = {
  path: string;
  faq?: readonly FaqItem[];
  software?: boolean | { name: string; description: string };
  article?: { title: string; description: string; dateModified: string; datePublished?: string; author?: "person"; abstract?: string; citation?: string };
  howTo?: { name: string; steps: readonly { id: string; name: string; text: string }[] };
  /** Visible breadcrumb trail; names must match the rendered breadcrumb text. */
  breadcrumb?: readonly { name: string; path: string }[];
};

export function siteJsonLdGraph(locale: Locale) {
  // Set DuoShot apart from the similarly named camera apps: it is a web screenshot studio for iOS developers.
  const distinguisher = locale === "fr"
    ? " DuoShot est un atelier web de captures App Store pour les développeurs iOS, sans rapport avec les applications caméra du même nom."
    : " DuoShot is a web App Store screenshot studio for iOS developers, unrelated to the camera apps of the same name.";
  const description = (locale === "fr" ? SITE_PITCH_FR : SITE_PITCH_EN).replace(
    "iPhone Duo", locale === "fr" ? "iPhone Duo (le téléphone pliable d'Apple)" : "iPhone Duo (Apple's foldable iPhone)",
  ) + distinguisher;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${absoluteUrl("/")}#organization`,
        name: SITE_NAME,
        logo: absoluteUrl("/brand/duoshot-logo.png"),
        sameAs: SITE_SAME_AS,
        url: absoluteUrl("/"),
        description,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${absoluteUrl("/")}#software`,
        publisher: { "@id": `${absoluteUrl("/")}#organization` },
        name: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: [
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
        description,
        url: absoluteUrl(localizedPath(locale, "/")),
      },
    ],
  };
}

export function jsonLdGraph(locale: Locale, { path, faq, software, article, howTo, breadcrumb }: PageSchema) {
  const url = absoluteUrl(localizedPath(locale, path));
  return {
    "@context": "https://schema.org",
    "@graph": [
      // Shared site entities are emitted by SiteJsonLd in the document layout.
      ...(typeof software === "object" ? [{
        "@type": "SoftwareApplication",
        "@id": `${url}#software`,
        publisher: { "@id": `${absoluteUrl("/")}#organization` },
        name: software.name,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        offers: [{ "@type": "Offer", name: software.name, description: software.description, price: "0", priceCurrency: "EUR" }],
        description: software.description,
        url,
      }] : []),
      ...(article ? [{
        "@type": "TechArticle",
        "@id": `${url}#article`,
        url,
        mainEntityOfPage: url,
        headline: article.title,
        description: article.description,
        ...(article.abstract !== undefined ? { abstract: article.abstract } : {}),
        inLanguage: locale,
        ...(article.datePublished ? { datePublished: article.datePublished } : {}),
        dateModified: article.dateModified,
        // A personal byline keeps the Organization as publisher; otherwise the org both authors and publishes.
        ...(article.author === "person"
          ? { author: { "@type": "Person", name: ARTICLE_AUTHOR }, publisher: { "@id": `${absoluteUrl("/")}#organization` } }
          : { author: { "@id": `${absoluteUrl("/")}#organization` } }),
        citation: article.citation ?? APPLE_SCREENSHOT_SOURCE,
      }] : []),
      ...(howTo?.steps.length ? [{
        "@type": "HowTo",
        "@id": `${url}#howto`,
        url,
        name: howTo.name,
        description: article?.description,
        inLanguage: locale,
        step: howTo.steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${url}#${step.id}`,
        })),
      }] : []),
      ...(faq?.length ? [{
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url,
        description: article?.description,
        inLanguage: locale,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }] : []),
      ...(breadcrumb?.length ? [{
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: breadcrumb.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(localizedPath(locale, item.path)),
        })),
      }] : []),
    ],
  };
}

export function JsonLd({ locale, ...schema }: { locale: Locale } & PageSchema) {
  const json = JSON.stringify(jsonLdGraph(locale, schema)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function SiteJsonLd({ locale }: { locale: Locale }) {
  const json = JSON.stringify(siteJsonLdGraph(locale)).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
