import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { DEVICES, deviceGuidePath } from "@/lib/devices";

describe("sitemap", () => {
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
