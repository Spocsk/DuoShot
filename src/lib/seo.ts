import type { Metadata } from "next";
import type { Locale } from "./specs";
import { SITE_NAME, absoluteUrl, localizedPath } from "./site";

export function pageMetadata(options: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const canonicalPath = localizedPath(options.locale, options.path);
  const fr = localizedPath("fr", options.path);
  const en = localizedPath("en", options.path);
  const isHome = canonicalPath === "/" || canonicalPath === "/en";
  const socialTitle = isHome ? `${SITE_NAME} — ${options.title}` : `${options.title} · ${SITE_NAME}`;
  return {
    robots: /^(?:\/en)?\/(tool|account|login|signup|invite|r)(?:\/|$)/.test(canonicalPath) || process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : undefined,
    title: isHome ? { absolute: socialTitle } : options.title,
    description: options.description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
      languages: {
        fr: absoluteUrl(fr),
        en: absoluteUrl(en),
        "x-default": absoluteUrl(fr),
      },
    },
    openGraph: {
      title: socialTitle,
      description: options.description,
      locale: options.locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: options.locale === "fr" ? ["en_US"] : ["fr_FR"],
      url: absoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: options.description,
    },
  };
}
