import type { Locale } from "./specs";
import { localizedPath, MARKETING_ROUTE_PAIRS } from "./site";

// The legacy cookie also stored automatic redirects; only explicit choices persist now.
export const LOCALE_COOKIE = "duoshot_locale_manual";
export const LOCALE_HEADER = "x-duoshot-locale";

const BOT_RE =
  /bot|crawler|spider|googlebot|bingbot|yandex|baidu|duckduck|slurp|facebookexternal|ia_archiver|linkedinbot|twitterbot|applebot|semrush|ahrefs/i;

export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return "en";
  let best: { locale: Locale; q: number } | null = null;
  for (const part of header.split(",")) {
    const [tagRaw, ...params] = part.trim().split(";");
    const tag = tagRaw.trim().toLowerCase();
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") q = Number(value);
    }
    if (!Number.isFinite(q) || q <= 0 || q > 1) continue;
    const locale: Locale | null = /^en(?:-|$)/.test(tag) ? "en" : /^fr(?:-|$)/.test(tag) ? "fr" : null;
    if (!locale) continue;
    if (!best || q > best.q) best = { locale, q };
  }
  return best?.locale ?? "en";
}

export function isCrawler(userAgent: string | null): boolean {
  return BOT_RE.test(userAgent ?? "");
}

export function shouldSkipLocaleRewrite(pathname: string): boolean {
  return (
    MARKETING_ROUTE_PAIRS.some(({ fr, en }) => pathname === fr || pathname === en) ||
    pathname.startsWith("/_next/") ||
    /\/(?:opengraph-image|twitter-image)(?:-[^/]+)?(?:\/[^/]+)?$/.test(pathname) ||
    /\.[^/]+$/.test(pathname) ||
    pathname === "/api" ||
    pathname === "/auth" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/llms") ||
    pathname === "/r" ||
    pathname.startsWith("/r/") ||
    pathname === "/en/r" ||
    pathname.startsWith("/en/r/")
  );
}

export function cookieLocale(value: string | undefined): Locale | null {
  return value === "en" || value === "fr" ? value : null;
}

function isLocalizedPage(pathname: string): boolean {
  if (MARKETING_ROUTE_PAIRS.some(({ fr, en }) => pathname === fr || pathname === en)) return true;
  const unprefixed = pathname === "/en" ? "/" : pathname.replace(/^\/en\//, "/");
  const segments = unprefixed === "/" ? [] : unprefixed.slice(1).split("/");
  // Next replaces this value at build time with routes derived from app/[locale].
  const routes: string[] = JSON.parse(process.env.DUOSHOT_LOCALIZED_PAGE_ROUTES ?? "[]");
  return routes.some((route) => {
    const parts = route === "/" ? [] : route.slice(1).split("/");
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      // Next requires catch-all segments to be last; optional ones also match
      // the parent URL, while regular catch-alls need at least one segment.
      if (/^\[\[\.\.\.[^\]]+\]\]$/.test(part)) {
        return index === parts.length - 1 && segments.slice(index).every(Boolean);
      }
      if (/^\[\.\.\.[^\]]+\]$/.test(part)) {
        return index === parts.length - 1 && segments.length > index && segments.slice(index).every(Boolean);
      }
      if (/^\[[^\]]+\]$/.test(part) ? !segments[index] : part !== segments[index]) return false;
    }
    return parts.length === segments.length;
  });
}

export function localeRedirectTarget(options: {
  pathname: string;
  search: string;
  cookie: string | undefined;
  acceptLanguage: string | null;
}): string | null {
  if (!isLocalizedPage(options.pathname)) return null;
  const current = localeFromPath(options.pathname);
  const preferred = cookieLocale(options.cookie) ?? parseAcceptLanguage(options.acceptLanguage);
  return preferred === current ? null : `${localizedPath(preferred, options.pathname)}${options.search}`;
}
