import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SizePage } from "@/components/size-page";
import { SCREENSHOT_SIZES, sizePageCopy } from "./screenshot-pages";
import { sizeEnrichment } from "./size-enrichment";
import { sizeFaq } from "./size-faq";
import { ASC_GUIDE_PATH, appStoreConnectGuide } from "./guides";
import { localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

/** The single application/ld+json graph SizePage emits, parsed back from the rendered HTML. */
function jsonLdFromHtml(html: string) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("no JSON-LD script found");
  return JSON.parse(match[1]);
}

describe("size page enrichment", () => {
  it.each(["fr", "en"] as const)("emits a valid FAQPage JSON-LD matching the visible FAQ in %s", (locale) => {
    for (const size of SCREENSHOT_SIZES) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      const faqNode = jsonLdFromHtml(html)["@graph"].find((node: { "@type": string }) => node["@type"] === "FAQPage");
      expect(faqNode).toBeTruthy();
      expect(Array.isArray(faqNode.mainEntity) && faqNode.mainEntity.length).toBeGreaterThan(0);
      for (const entity of faqNode.mainEntity) {
        expect(entity["@type"]).toBe("Question");
        expect(entity.name).toBeTruthy();
        expect(entity.acceptedAnswer["@type"]).toBe("Answer");
        expect(entity.acceptedAnswer.text).toBeTruthy();
      }
      // The JSON-LD questions are exactly the visible FAQ questions.
      expect(faqNode.mainEntity.map((entity: { name: string }) => entity.name)).toEqual(sizeFaq(locale, size).map((item) => item.q));
    }
  });

  it.each(["fr", "en"] as const)("links to the three other size pages and the App Store Connect guide in %s", (locale) => {
    for (const size of SCREENSHOT_SIZES) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      for (const related of SCREENSHOT_SIZES.filter((other) => other !== size)) {
        expect(html).toContain(`href="${localizedPath(locale, `/${related}`)}"`);
      }
      expect(html).toContain(`href="${localizedPath(locale, ASC_GUIDE_PATH)}"`);
      expect(html).toContain(appStoreConnectGuide(locale).title);
    }
  });

  it.each(["fr", "en"] as const)("renders the devices, orientation and rejection errors in %s", (locale) => {
    for (const size of SCREENSHOT_SIZES) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      const enrich = sizeEnrichment(locale, size);
      expect(html).toContain(enrich.devices.heading);
      expect(html).toContain(enrich.orientation.heading);
      expect(html).toContain(enrich.rejections.heading);
      expect(enrich.rejections.items).toHaveLength(3);
      // The three rejection causes: wrong size, transparency/alpha channel, wrong (PNG/JPEG) format.
      const rejections = enrich.rejections.items.join(" ");
      expect(rejections).toMatch(locale === "fr" ? /canal alpha|transparence/i : /alpha channel|transparen/i);
      expect(rejections).toMatch(/PNG|JPEG/);
    }
  });

  it("gives each size unique copy and keeps French distinct from English", () => {
    const blob = (locale: "fr" | "en", size: typeof SCREENSHOT_SIZES[number]) => {
      const enrich = sizeEnrichment(locale, size);
      return [enrich.devices.body, enrich.orientation.body, enrich.rejections.intro, ...enrich.rejections.items].join(" ");
    };
    for (const locale of ["fr", "en"] as const) {
      const blobs = SCREENSHOT_SIZES.map((size) => blob(locale, size));
      expect(new Set(blobs).size).toBe(SCREENSHOT_SIZES.length);
    }
    for (const size of SCREENSHOT_SIZES) {
      expect(blob("fr", size)).not.toBe(blob("en", size));
      expect(sizePageCopy("fr", size).title).not.toBe(sizePageCopy("en", size).title);
    }
  });

  it("never claims both iPhone Duo sizes are required", () => {
    for (const locale of ["fr", "en"] as const) {
      for (const size of SCREENSHOT_SIZES) {
        const enrich = sizeEnrichment(locale, size);
        const text = [enrich.devices.body, enrich.orientation.body, enrich.rejections.intro, ...enrich.rejections.items].join(" ").toLowerCase();
        expect(text).not.toContain("les deux tailles");
        expect(text).not.toContain("both sizes");
        expect(text).not.toContain("both duo sizes");
      }
    }
  });
});
