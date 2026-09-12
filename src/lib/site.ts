import type { Locale } from "./specs";

export const SITE_NAME = "DuoShot";
export const SITE_PITCH_FR = "Tes screenshots Duo, justes, en 3 minutes. Sans device.";
export const SITE_PITCH_EN = "Accurate Duo screenshots in 3 minutes. No device.";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "fr") return clean === "/en" ? "/" : clean.replace(/^\/en/, "") || "/";
  if (clean === "/") return "/en";
  if (clean.startsWith("/en")) return clean;
  return `/en${clean}`;
}

export function absoluteUrl(pathname: string): string {
  return `${getSiteUrl()}${pathname}`;
}
