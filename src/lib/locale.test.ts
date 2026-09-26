import { describe, expect, it } from "vitest";
import {
  cookieLocale,
  isCrawler,
  localeFromPath,
  localeRedirectTarget,
  parseAcceptLanguage,
  shouldSkipLocaleRewrite,
} from "./locale";

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

  it("skips api, auth and crawlers", () => {
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

  it("leaves static resources alone", () => {
    for (const path of ["/sitemap.xml", "/robots.txt", "/font.woff2", "/_next/anything", "/api", "/auth"]) {
      expect(shouldSkipLocaleRewrite(path)).toBe(true);
    }
  });

});
