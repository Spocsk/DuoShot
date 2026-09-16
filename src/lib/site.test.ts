import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl, localePrefix, localizedPath, reviewPath, toolPath } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("site", () => {
  it("prefixes English paths", () => {
    expect(localePrefix("fr")).toBe("");
    expect(localePrefix("en")).toBe("/en");
    expect(toolPath("fr")).toBe("/tool");
    expect(toolPath("en")).toBe("/en/tool");
  });

  it("mirrors a path into the other locale", () => {
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("en", "/tool")).toBe("/en/tool");
    expect(localizedPath("fr", "/en")).toBe("/");
    expect(localizedPath("fr", "/en/tool")).toBe("/tool");
    expect(localizedPath("en", "/en/specs")).toBe("/en/specs");
    expect(localizedPath("en", "/pricing")).toBe("/en/pricing");
    expect(localizedPath("fr", "/en/pricing")).toBe("/pricing");
    expect(localizedPath("en", "/r/harbor")).toBe("/en/r/harbor");
    expect(localizedPath("fr", "/r/harbor")).toBe("/r/harbor");
    expect(localizedPath("fr", "/en/r/harbor")).toBe("/r/harbor");
    expect(localizedPath("en", "/en/r/harbor")).toBe("/en/r/harbor");
  });

  it("builds localized review URLs", () => {
    expect(reviewPath("fr", "abc123")).toBe("/r/abc123");
    expect(reviewPath("en", "abc123")).toBe("/en/r/abc123");
  });

  it("reads the public site URL from env", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.example/");
    expect(getSiteUrl()).toBe("https://duoshot.example");
  });

  it("falls back to localhost without a public URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
