import type { Locale } from "./specs";
import { localizedPath } from "./site";

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
    pathname.startsWith("/_next/") ||
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

export function localeRedirectTarget(options: {
  pathname: string;
  search: string;
  cookie: string | undefined;
  acceptLanguage: string | null;
}): string | null {
  const current = localeFromPath(options.pathname);
  const preferred = cookieLocale(options.cookie) ?? parseAcceptLanguage(options.acceptLanguage);
  return preferred === current ? null : `${localizedPath(preferred, options.pathname)}${options.search}`;
}
