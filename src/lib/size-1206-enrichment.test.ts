import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SizePage } from "@/components/size-page";
import { SCREENSHOT_SIZES, SIZE_1206_VERIFIED_ON } from "./screenshot-pages";
import { MEDIUM_DISPLAY_DEVICE_SLUGS, sizeEnrichment } from "./size-enrichment";
import { sizeFaq } from "./size-faq";
import { DEVICE_SLUGS, deviceGuidePath } from "./devices";
import { localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

const SOURCE = readFileSync(
  path.join(process.cwd(), "docs/sources/apple-screenshot-specifications-2026-11-20.txt"),
  "utf8",
);

/** Collapse whitespace and typographic apostrophes so verbatim quotes compare equal to the source. */
const normalizeQuote = (text: string) => text.replace(/[’']/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const NORMALIZED_SOURCE = normalizeQuote(SOURCE);

const SCALING_QUOTE =
  "If your app’s user interface is consistent across multiple device sizes and localizations, you only need to provide screenshots for the highest required resolution. App Store Connect automatically scales them down for smaller device sizes.";
const MEDIUM_DISPLAY_QUOTE = "At least one screenshot for iPhone with Dynamic Island (medium display).";

/** Every string this change adds to the 1206 × 2622 page, in one locale. */
function addedStrings(locale: "fr" | "en"): string[] {
  const enrich = sizeEnrichment(locale, "1206x2622");
  const faq = sizeFaq(locale, "1206x2622");
  return [
    enrich.scaling!.heading,
    enrich.scaling!.intro,
    enrich.scaling!.quote,
    enrich.scaling!.cite,
    enrich.scaling!.body,
    enrich.deviceLinks!.heading,
    enrich.deviceLinks!.intro,
    enrich.rejections.items[5],
    ...faq.slice(6).flatMap((item) => [item.q, item.a]),
  ];
}

describe("1206 × 2622 enrichment", () => {
  it.each(["fr", "en"] as const)("quotes Apple's display-scaling rule verbatim in the HTML and the source in %s", (locale) => {
    const scaling = sizeEnrichment(locale, "1206x2622").scaling!;
    expect(scaling.quote).toBe(SCALING_QUOTE);
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size: "1206x2622" }));
    expect(html).toContain(scaling.heading);
    expect(html).toContain(SCALING_QUOTE);
    expect(html).toContain(MEDIUM_DISPLAY_QUOTE);
    // Both quotes appear word for word in Apple's source file.
    expect(NORMALIZED_SOURCE).toContain(normalizeQuote(SCALING_QUOTE));
    expect(NORMALIZED_SOURCE).toContain(normalizeQuote(MEDIUM_DISPLAY_QUOTE));
  });

  it("ships the Display scaling section only on 1206x2622", () => {
    for (const locale of ["fr", "en"] as const) {
      const heading = sizeEnrichment(locale, "1206x2622").scaling!.heading;
      for (const size of SCREENSHOT_SIZES) {
        if (size === "1206x2622") continue;
        expect(sizeEnrichment(locale, size).scaling).toBeUndefined();
        const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
        expect(html).not.toContain(heading);
        expect(html).not.toContain('aria-labelledby="size-scaling"');
      }
    }
  });

  it.each(["fr", "en"] as const)("links to the seven medium-display device pages, none to iphone-14-pro, in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size: "1206x2622" }));
    expect(MEDIUM_DISPLAY_DEVICE_SLUGS).toHaveLength(7);
    for (const slug of MEDIUM_DISPLAY_DEVICE_SLUGS) {
      expect(DEVICE_SLUGS).toContain(slug);
      expect(html).toContain(`href="${localizedPath(locale, deviceGuidePath(slug))}"`);
    }
    expect(localizedPath(locale, deviceGuidePath("iphone-15"))).toBe(
      locale === "en" ? "/en/guides/screenshot-size/iphone-15" : "/guides/screenshot-size/iphone-15",
    );
    expect(html).not.toContain("screenshot-size/iphone-14-pro");
    // This change never introduces a comparison link.
    for (const text of addedStrings(locale)) expect(text).not.toContain("duoshot-vs-appscreens");
  });

  it.each(["fr", "en"] as const)("keeps the added copy free of forbidden phrasing but with the pixel math in %s", (locale) => {
    const blob = addedStrings(locale).join(" ");
    expect(blob).not.toMatch(/reject|rejet/i);
    expect(blob).not.toContain("optimized for iPhone Duo");
    expect(blob).not.toContain("6,9″ optionnel");
    expect(blob).not.toContain("6.9″ optional");
    expect(blob).not.toContain("other iPhone sizes are optional");
    expect(blob).toContain("1206 × 2620");
    expect(blob).toContain("1179 × 2555");
  });

  it.each(["fr", "en"] as const)("carries the 2026-11-20 verification date in the HTML and JSON-LD, not the old date, in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size: "1206x2622" }));
    expect(html).toContain(SIZE_1206_VERIFIED_ON);
    expect(html).not.toContain("2026-11-13");
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const graph = JSON.parse(match![1])["@graph"];
    const article = graph.find((node: { "@type": string }) => node["@type"] === "TechArticle");
    expect(article.dateModified).toBe(SIZE_1206_VERIFIED_ON);
  });

  it("defines scaling, deviceLinks and eight FAQ entries in both locales", () => {
    for (const locale of ["fr", "en"] as const) {
      const enrich = sizeEnrichment(locale, "1206x2622");
      expect(enrich.scaling).toBeTruthy();
      expect(enrich.deviceLinks).toBeTruthy();
      expect(sizeFaq(locale, "1206x2622")).toHaveLength(8);
    }
    // FR and EN expose the same optional fields.
    const fr = sizeEnrichment("fr", "1206x2622");
    const en = sizeEnrichment("en", "1206x2622");
    expect(Boolean(fr.scaling)).toBe(Boolean(en.scaling));
    expect(Boolean(fr.deviceLinks)).toBe(Boolean(en.deviceLinks));
  });
});
