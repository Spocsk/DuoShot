import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { DEVICES, deviceGuidePath } from "@/lib/devices";
import { MARKETING_ROUTE_PAIRS } from "@/lib/site";
import { LEGAL_PATH } from "@/lib/seo";
import { comparePublishedRoutes } from "@/lib/compare";

describe("sitemap", () => {
  it("derives its URL count from this branch's sources of truth", () => {
    const marketingPairs = MARKETING_ROUTE_PAIRS.filter((route) => !LEGAL_PATH.test(route.fr)).length;
    const expectedPairs = marketingPairs + DEVICES.length + comparePublishedRoutes().length;
    // Each route pair yields one FR and one EN entry.
    expect(sitemap()).toHaveLength(expectedPairs * 2);
  });

  it("stamps every entry with a fresh, parseable lastmod", () => {
    for (const entry of sitemap()) {
      expect(entry.lastModified, entry.url).toBeDefined();
      expect(Number.isNaN(Date.parse(String(entry.lastModified))), String(entry.lastModified)).toBe(false);
      // Not an obviously stale hardcoded date: at or after the last device verification.
      expect(String(entry.lastModified) >= "2026-11-03").toBe(true);
    }
  });

  it("leaves legal pages out", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/specs");
    for (const path of ["/privacy", "/terms", "/cookies", "/legal", "/legal/subprocessors"]) {
      expect(urls).not.toContain(path);
      expect(urls).not.toContain(`/en${path}`);
    }
  });

  it("lists the guides hub content guides in both locales", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    for (const slug of ["app-store-screenshot-sizes", "app-store-screenshot-guidelines", "app-preview-specifications", "app-store-creative-assets"]) {
      expect(urls).toContain(`/guides/${slug}`);
      expect(urls).toContain(`/en/guides/${slug}`);
    }
  });

  it("lists every device page in both locales with alternates", () => {
    const entries = sitemap();
    const byPath = new Map(entries.map((entry) => [new URL(entry.url).pathname, entry]));
    for (const device of DEVICES) {
      const fr = deviceGuidePath(device.slug);
      const en = `/en${fr}`;
      expect(byPath.has(fr), fr).toBe(true);
      expect(byPath.has(en), en).toBe(true);
      const origin = new URL(entries[0].url).origin;
      expect(byPath.get(fr)!.alternates?.languages).toEqual({
        fr: `${origin}${fr}`,
        en: `${origin}${en}`,
        "x-default": `${origin}${fr}`,
      });
    }
  });
});
