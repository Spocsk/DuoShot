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
    expect(parseAcceptLanguage(null)).toBe("fr");
    expect(parseAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(parseAcceptLanguage("de,en;q=0.4")).toBe("en");
  });

  it("skips api, auth and crawlers", () => {
    expect(shouldSkipLocaleRewrite("/api/export")).toBe(true);
    expect(shouldSkipLocaleRewrite("/auth/callback")).toBe(true);
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
    ).toBeNull();
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
});
