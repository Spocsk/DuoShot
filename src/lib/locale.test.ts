import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";
import {
  cookieLocale,
  isCrawler,
  localeFromPath,
  localeRedirectTarget,
  parseAcceptLanguage,
  shouldSkipLocaleRewrite,
} from "./locale";

beforeEach(() => {
  vi.stubEnv("DUOSHOT_LOCALIZED_PAGE_ROUTES", nextConfig.env!.DUOSHOT_LOCALIZED_PAGE_ROUTES!);
});
afterEach(() => vi.unstubAllEnvs());

describe("locale", () => {
  it("reads the path locale", () => {
    expect(localeFromPath("/")).toBe("fr");
    expect(localeFromPath("/tool")).toBe("fr");
    expect(localeFromPath("/en")).toBe("en");
    expect(localeFromPath("/en/tool")).toBe("en");
  });

  it("parses Accept-Language with q values", () => {
    expect(parseAcceptLanguage(null)).toBe("en");
    expect(parseAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(parseAcceptLanguage("de,en;q=0.4")).toBe("en");
  });

  it("skips public sitemap pages, api, auth and crawlers", () => {
    for (const path of ["/", "/en", "/pricing", "/en/pricing", "/pourquoi-pas-ia", "/en/why-not-ai"]) {
      expect(shouldSkipLocaleRewrite(path)).toBe(true);
    }
    expect(shouldSkipLocaleRewrite("/api/export")).toBe(true);
    expect(shouldSkipLocaleRewrite("/auth/callback")).toBe(true);
    expect(shouldSkipLocaleRewrite("/r/abc123")).toBe(true);
    expect(shouldSkipLocaleRewrite("/en/r/abc123")).toBe(true);
    expect(shouldSkipLocaleRewrite("/tool")).toBe(false);
    expect(isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isCrawler("Mozilla/5.0 (Macintosh)")).toBe(false);
  });

  it("redirects EN browsers from FR routes without a cookie", () => {
    expect(
      localeRedirectTarget({
        pathname: "/",
        search: "",
        cookie: undefined,
        acceptLanguage: "en-GB,en;q=0.9",
      }),
    ).toBe("/en");
    expect(
      localeRedirectTarget({
        pathname: "/en",
        search: "",
        cookie: undefined,
        acceptLanguage: "fr",
      }),
    ).toBe("/");
  });

  it("honors the locale cookie over Accept-Language", () => {
    expect(cookieLocale("en")).toBe("en");
    expect(
      localeRedirectTarget({
        pathname: "/",
        search: "?x=1",
        cookie: "en",
        acceptLanguage: "fr",
      }),
    ).toBe("/en?x=1");
    expect(
      localeRedirectTarget({
        pathname: "/en/tool",
        search: "",
        cookie: "fr",
        acceptLanguage: "en",
      }),
    ).toBe("/tool");
  });
  it("uses English as fallback and ignores excluded or malformed preferences", () => {
    for (const header of [null, "", "de-DE", "*", "fr;q=0", "fr;q=2", "fr;q=no", "french", "english"]) {
      expect(parseAcceptLanguage(header)).toBe("en");
    }
    expect(parseAcceptLanguage("fr-CA,en;q=0.8")).toBe("fr");
    expect(parseAcceptLanguage("en;q=0,fr;q=0.5")).toBe("fr");
    expect(parseAcceptLanguage("en;q=0.5,fr;q=0.5")).toBe("en");
  });

  it("preserves paths and parameters in both directions without loops", () => {
    expect(localeRedirectTarget({ pathname: "/en/tool", search: "?set=123", cookie: undefined, acceptLanguage: "fr-FR" })).toBe("/tool?set=123");
    expect(localeRedirectTarget({ pathname: "/tool", search: "?set=123", cookie: undefined, acceptLanguage: "fr-FR" })).toBeNull();
    expect(localeRedirectTarget({ pathname: "/tool", search: "", cookie: "invalid", acceptLanguage: "de" })).toBe("/en/tool");
    expect(localeRedirectTarget({ pathname: "/en/why-not-ai", search: "", cookie: undefined, acceptLanguage: "fr" })).toBe("/pourquoi-pas-ia");
  });

  it("recognizes every localized page from the app directory", () => {
    const routes: string[] = JSON.parse(nextConfig.env!.DUOSHOT_LOCALIZED_PAGE_ROUTES!);
    expect(routes).toContain("/tool");
    expect(routes).toContain("/account");
    expect(routes).toContain("/invite/[token]");
    for (const route of routes) {
      const pathname = route.replace(/\[[^\]]+\]/g, "example");
      expect(localeRedirectTarget({ pathname, search: "?x=1", cookie: undefined, acceptLanguage: null })).not.toBeNull();
    }
  });

  it("leaves unknown pages to Next's 404 handler in both locales", () => {
    for (const path of ["/xyz-nope", "/tool/xyz-nope", "/account/xyz-nope", "/login/xyz-nope", "/invite", "/invite/token/xyz-nope"]) {
      for (const pathname of [path, `/en${path}`]) {
        for (const cookie of [undefined, "en", "fr"]) {
          for (const acceptLanguage of [null, "en", "fr"]) {
            expect(localeRedirectTarget({ pathname, search: "?x=1", cookie, acceptLanguage })).toBeNull();
          }
        }
      }
    }
  });

  it("leaves static resources alone", () => {
    for (const path of ["/sitemap.xml", "/robots.txt", "/font.woff2", "/_next/anything", "/api", "/auth", "/opengraph-image-35za9p", "/en/opengraph-image", "/en/specs/opengraph-image", "/specs/opengraph-image-vneuru", "/en/rejection/twitter-image", "/fr/opengraph-image/card", "/en/pricing/opengraph-image/card"]) {
      expect(shouldSkipLocaleRewrite(path)).toBe(true);
    }
  });

});
