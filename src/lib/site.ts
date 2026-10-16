import type { Locale } from "./specs";
import { publicEnv } from "./env-public";

export const SITE_NAME = "DuoShot";
export const SITE_DESCRIPTOR = "iPhone Duo App Store Screenshots";
export const SITE_PITCH_FR =
  "Créez vos captures App Store iPhone Duo en PNG/JPEG opaque. Essai gratuit avec le 6,3″ requis ; 6,9″ optionnel avec Pass, Indie et Studio.";
export const SITE_PITCH_EN =
  "Create iPhone Duo App Store screenshots as opaque PNG/JPEG. Free trial with required 6.3″; optional 6.9″ with Pass, Indie and Studio.";

export function getSiteUrl(): string {
  const explicit = publicEnv.siteUrl;
  if (explicit) return explicit;
  return "http://localhost:3000";
}

function reviewIdFromPath(path: string): string | null {
  const match = path.match(/^\/(?:en\/)?r\/([^/]+)/);
  if (match?.[1]) return match[1];
  if (path === "/r" || path === "/en/r") return "";
  return null;
}

export function reviewPath(locale: Locale, id: string): string {
  return locale === "en" ? `/en/r/${id}` : `/r/${id}`;
}

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const pair = MARKETING_ROUTE_PAIRS.find((route) => route.fr === clean || route.en === clean || `/en${route.fr}` === clean);
  if (pair) return pair[locale];
  const reviewId = reviewIdFromPath(clean);
  if (reviewId !== null) {
    if (!reviewId) return locale === "en" ? "/en/r" : "/r";
    return reviewPath(locale, reviewId);
  }
  if (locale === "fr") return clean === "/en" ? "/" : clean.replace(/^\/en/, "") || "/";
  if (clean === "/") return "/en";
  if (clean.startsWith("/en")) return clean;
  return `/en${clean}`;
}

export function absoluteUrl(pathname: string): string {
  // Next's metadata resolver serializes the site root without a trailing slash.
  // Use that exact form in the sitemap and JSON-LD as well.
  return `${getSiteUrl()}${pathname === "/" ? "" : pathname}`;
}

export function localePrefix(locale: Locale): string {
  return locale === "en" ? "/en" : "";
}

export function toolPath(locale: Locale): string {
  return `${localePrefix(locale)}/tool`;
}

export function pricingPath(locale: Locale): string {
  return `${localePrefix(locale)}/pricing`;
}

export function rejectionPath(locale: Locale): string {
  return locale === "en" ? "/en/rejection" : "/rejet";
}

export const MARKETING_ROUTE_PAIRS = [
  { fr: "/", en: "/en", priority: 1 },
  { fr: "/pricing", en: "/en/pricing", priority: 0.8 },
  { fr: "/specs", en: "/en/specs", priority: 1 },
  { fr: "/guides/best-app-store-screenshot-generator", en: "/en/guides/best-app-store-screenshot-generator", priority: 0.7 },
  { fr: "/guides/iphone-duo-app-store-connect", en: "/en/guides/iphone-duo-app-store-connect", priority: 0.7 },
  { fr: "/1398x2034", en: "/en/1398x2034", priority: 0.8 },
  { fr: "/2007x2853", en: "/en/2007x2853", priority: 0.8 },
  { fr: "/1206x2622", en: "/en/1206x2622", priority: 0.8 },
  { fr: "/1320x2868", en: "/en/1320x2868", priority: 0.8 },
  { fr: "/pourquoi-pas-ia", en: "/en/why-not-ai", priority: 0.7 },
  { fr: "/rejet", en: "/en/rejection", priority: 0.7 },
  { fr: "/privacy", en: "/en/privacy", priority: 0.4 },
  { fr: "/terms", en: "/en/terms", priority: 0.4 },
  { fr: "/cookies", en: "/en/cookies", priority: 0.4 },
  { fr: "/legal", en: "/en/legal", priority: 0.4 },
  { fr: "/legal/subprocessors", en: "/en/legal/subprocessors", priority: 0.4 },
] as const;
