import type { Locale } from "./specs";
import { localizedPath } from "./site";

export const LOCALE_COOKIE = "duoshot_locale";
export const LOCALE_HEADER = "x-duoshot-locale";

const BOT_RE =
  /bot|crawler|spider|googlebot|bingbot|yandex|baidu|duckduck|slurp|facebookexternal|ia_archiver|linkedinbot|twitterbot|applebot|semrush|ahrefs/i;

export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return "fr";
  let best: { locale: Locale; q: number } | null = null;
  for (const part of header.split(",")) {
    const [tagRaw, ...params] = part.trim().split(";");
    const tag = tagRaw.trim().toLowerCase();
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") q = Number(value);
    }
    if (!Number.isFinite(q)) q = 0;
    const locale: Locale | null = tag.startsWith("en") ? "en" : tag.startsWith("fr") ? "fr" : null;
    if (!locale) continue;
    if (!best || q > best.q) best = { locale, q };
  }
  return best?.locale ?? "fr";
}

export function isCrawler(userAgent: string | null): boolean {
  return BOT_RE.test(userAgent ?? "");
}

export function shouldSkipLocaleRewrite(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/auth/") || pathname.startsWith("/llms");
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
  const cookie = cookieLocale(options.cookie);
  if (cookie) {
    if (cookie === current) return null;
    return `${localizedPath(cookie, options.pathname)}${options.search}`;
  }
  if (parseAcceptLanguage(options.acceptLanguage) === "en" && current === "fr") {
    return `${localizedPath("en", options.pathname)}${options.search}`;
  }
  return null;
}
