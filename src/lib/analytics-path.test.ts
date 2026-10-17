import { describe, expect, it } from "vitest";
import { analyticsPath, sanitizedAnalyticsUrl } from "./analytics-path";
import { COMPARISONS, comparisonPath } from "./comparisons";

describe("analytics URL minimization", () => {
  it("keeps only stable route names", () => {
    expect(analyticsPath("/en/tool")).toBe("/tool");
    expect(analyticsPath("/invite/private-token")).toBe("/invite/[token]");
    expect(analyticsPath("/en/r/private-id")).toBe("/r/[id]");
    expect(analyticsPath("/auth/callback")).toBeNull();
    expect(analyticsPath("/unknown/private-id")).toBeNull();
    expect(analyticsPath("/invite/private-token/extra")).toBeNull();
    expect(analyticsPath("/reset-password")).toBeNull();
    expect(analyticsPath("/account/private-id")).toBeNull();
    expect(analyticsPath("/guides/private-id")).toBeNull();
    expect(analyticsPath("/guides/duoshot-vs-unknown")).toBeNull();
    expect(analyticsPath("/guides/%64uoshot-vs-appscreens")).toBeNull();
    expect(analyticsPath("/tools/private-id")).toBeNull();
  });

  it.each([
    "/forgot-password", "/specs", "/1398x2034", "/2007x2853", "/1206x2622", "/1320x2868",
    "/tools/iphone-duo-screenshot-checker", "/guides/iphone-duo-app-store-connect",
    "/guides/best-app-store-screenshot-generator", ...COMPARISONS.map(({ slug }) => comparisonPath(slug)),
  ])("allows the existing public route %s in both locales", (path) => {
    expect(analyticsPath(path)).toBe(path);
    expect(analyticsPath(`/en${path}/`)).toBe(path);
    expect(sanitizedAnalyticsUrl(`https://duoshot.site/en${path}?token=secret#private`))
      .toBe(`https://duoshot.site/en${path}`);
  });

  it("removes tokens and query parameters before Vercel receives a page view", () => {
    expect(sanitizedAnalyticsUrl("https://duoshot.test/en/r/secret?token=private"))
      .toBe("https://duoshot.test/en/r/[id]");
    expect(sanitizedAnalyticsUrl("https://duoshot.test/tool?session_id=cs_private"))
      .toBe("https://duoshot.test/tool");
    expect(sanitizedAnalyticsUrl("https://duoshot.test/auth/confirm?token_hash=private"))
      .toBeNull();
  });
});
