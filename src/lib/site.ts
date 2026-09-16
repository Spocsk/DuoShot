import type { Locale } from "./specs";

export const SITE_NAME = "DuoShot";
export const SITE_DESCRIPTOR = "App Store Screenshot QA";
export const SITE_PITCH_FR =
  "Ton IA resize. Nous on te sort le ZIP que Connect accepte du premier coup — sans alpha, sans clone outer/inner, sans rejet.";
export const SITE_PITCH_EN =
  "Your AI resizes. We hand you the ZIP Connect accepts first try — no alpha, no outer/inner clone, no rejection.";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
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
  return `${getSiteUrl()}${pathname}`;
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
  { fr: "/pourquoi-pas-ia", en: "/en/why-not-ai", priority: 0.7 },
  { fr: "/rejet", en: "/en/rejection", priority: 0.7 },
  { fr: "/privacy", en: "/en/privacy", priority: 0.4 },
  { fr: "/terms", en: "/en/terms", priority: 0.4 },
  { fr: "/cookies", en: "/en/cookies", priority: 0.4 },
  { fr: "/legal", en: "/en/legal", priority: 0.4 },
  { fr: "/legal/subprocessors", en: "/en/legal/subprocessors", priority: 0.4 },
] as const;
