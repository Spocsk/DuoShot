import type { Metadata } from "next";
import type { Locale } from "./specs";
import { SITE_NAME, absoluteUrl, localizedPath } from "./site";

export function pageMetadata(options: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const canonicalPath = options.locale === "fr" ? options.path : localizedPath("en", options.path);
  const fr = options.path;
  const en = localizedPath("en", options.path);
  return {
    title: `${options.title} · ${SITE_NAME}`,
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
      title: `${options.title} · ${SITE_NAME}`,
      description: options.description,
      locale: options.locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: options.locale === "fr" ? ["en_US"] : ["fr_FR"],
      url: absoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${options.title} · ${SITE_NAME}`,
      description: options.description,
    },
  };
}
