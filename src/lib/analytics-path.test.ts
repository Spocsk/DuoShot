import { describe, expect, it } from "vitest";
import { analyticsPath, sanitizedAnalyticsUrl } from "./analytics-path";

describe("analytics URL minimization", () => {
  it("keeps only stable route names", () => {
    expect(analyticsPath("/en/tool")).toBe("/tool");
    expect(analyticsPath("/invite/private-token")).toBe("/invite/[token]");
    expect(analyticsPath("/en/r/private-id")).toBe("/r/[id]");
    expect(analyticsPath("/auth/callback")).toBeNull();
    expect(analyticsPath("/unknown/private-id")).toBeNull();
    expect(analyticsPath("/invite/private-token/extra")).toBeNull();
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
