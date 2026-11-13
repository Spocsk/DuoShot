import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SizePage } from "@/components/size-page";
import { SCREENSHOT_SIZES, sizePageCopy } from "./screenshot-pages";
import { sizeEnrichment } from "./size-enrichment";
import { sizeFaq } from "./size-faq";
import { ASC_GUIDE_PATH, appStoreConnectGuide } from "./guides";
import { localizedPath, rejectionPath } from "./site";
import { deviceGuidePath } from "./devices";
import { SCREENSHOT_CHECKER_PATH } from "./screenshot-checker";

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
      expect(enrich.rejections.items).toHaveLength(size === "1320x2868" ? 3 : 5);
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

  it.each(["fr", "en"] as const)("renders the 1206x2622 Apple-slots table with four rows and the source in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size: "1206x2622" }));
    const slots = sizeEnrichment(locale, "1206x2622").slots!;
    expect(slots).toBeTruthy();
    expect(slots.rows).toHaveLength(4);
    expect(html).toContain("<table");
    expect(html).toContain('scope="col"');
    expect(html).toContain(slots.heading);
    for (const row of slots.rows) expect(html).toContain(row.group);
    expect(html).toContain(slots.source);
    expect(html).toContain(locale === "fr" ? "vérifié le 13 novembre 2026" : "checked November 13, 2026");
    // The table ships only on the 1206x2622 page.
    const other = renderToStaticMarkup(createElement(SizePage, { locale, size: "1320x2868" }));
    expect(sizeEnrichment(locale, "1320x2868").slots).toBeUndefined();
    expect(other).not.toContain(slots.heading);
  });

  it.each(["fr", "en"] as const)("adds the Duo guide, checker and rejection links on the 1206x2622 page in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size: "1206x2622" }));
    expect(html).toContain(`href="${localizedPath(locale, deviceGuidePath("iphone-duo"))}"`);
    expect(html).toContain(`href="${localizedPath(locale, SCREENSHOT_CHECKER_PATH)}"`);
    expect(html).toContain(`href="${rejectionPath(locale)}"`);
    expect(localizedPath(locale, deviceGuidePath("iphone-duo"))).toBe(locale === "en" ? "/en/guides/screenshot-size/iphone-duo" : "/guides/screenshot-size/iphone-duo");
    expect(localizedPath(locale, SCREENSHOT_CHECKER_PATH)).toBe(locale === "en" ? "/en/tools/iphone-duo-screenshot-checker" : "/tools/iphone-duo-screenshot-checker");
    expect(rejectionPath(locale)).toBe(locale === "en" ? "/en/rejection" : "/rejet");
  });

  it.each(["fr", "en"] as const)("gives the 1206x2622 FAQ six questions mirrored in the JSON-LD in %s", (locale) => {
    const faq = sizeFaq(locale, "1206x2622");
    expect(faq).toHaveLength(6);
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size: "1206x2622" }));
    const faqNode = jsonLdFromHtml(html)["@graph"].find((node: { "@type": string }) => node["@type"] === "FAQPage");
    expect(faqNode.mainEntity.map((entity: { name: string }) => entity.name)).toEqual(faq.map((item) => item.q));
    expect(faqNode.mainEntity.map((entity: { acceptedAnswer: { text: string } }) => entity.acceptedAnswer.text)).toEqual(faq.map((item) => item.a));
  });

  it("drops the old ambiguous large-display sentence from the 1206x2622 devices copy", () => {
    expect(sizeEnrichment("en", "1206x2622").devices.body).not.toContain("scales the large-display ones");
  });

  it.each(["1398x2034", "2007x2853"] as const)("renders the Duo slots table with the separate required medium-display row on %s", (size) => {
    for (const locale of ["fr", "en"] as const) {
      const slots = sizeEnrichment(locale, size).slots!;
      expect(slots).toBeTruthy();
      expect(slots.rows).toHaveLength(2);
      // Exactly one row is the single merged iPhone Duo row (outer + inner together, never two Duo rows).
      const duoRows = slots.rows.filter((row) => row.group.toLowerCase().includes("iphone duo"));
      expect(duoRows).toHaveLength(1);
      // The second row is the still-required, SEPARATE iPhone with Dynamic Island (medium display) group.
      expect(slots.rows[1].group.toLowerCase()).toContain("medium display");
      expect(slots.rows[1].group.toLowerCase()).toMatch(locale === "fr" ? /requis|distinct/ : /required|separate/);
      expect(slots.rows[1].sizes.map((part) => part.text).join(" ")).toContain("1179 × 2556");
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      expect(html).toContain(slots.heading);
      for (const row of slots.rows) expect(html).toContain(row.group);
      expect(html).toContain(locale === "fr" ? "vérifié le 13 novembre 2026" : "checked November 13, 2026");
      // The emphasized size is the page's own display size.
      const emphasized = slots.rows.flatMap((row) => row.sizes).find((part) => part.strong)!;
      expect(emphasized.text).toContain(size === "1398x2034" ? "1398 × 2034" : "2007 × 2853");
      // Never the ambiguous "Duo slot" phrasing the specs guide test also forbids.
      expect(html).not.toMatch(/Duo slot|emplacement Duo|emplacement iPhone Duo/i);
      // The French enrichment never uses the word "puits" (replaced by "emplacement").
      if (locale === "fr") {
        const frText = [slots.heading, slots.source, slots.note, ...slots.rows.flatMap((row) => [row.group, row.status, ...row.sizes.map((part) => part.text)])].join(" ");
        expect(frText).not.toContain("puits");
      }
    }
  });

  it.each(["1398x2034", "2007x2853"] as const)("quotes both April 2027 wordings separately, verbatim, on %s", (size) => {
    for (const locale of ["fr", "en"] as const) {
      const timeline = sizeEnrichment(locale, size).timeline!;
      expect(timeline.quotes).toHaveLength(2);
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      expect(html).toContain("Starting in April 2027, screenshots will be required for any app using the iOS 27.1 SDK or later.");
      expect(html).toContain("Starting April 2027, any apps or games submitted will need to include screenshots for iPhone Duo.");
      // The two wordings are never fused into one sentence.
      expect(html).not.toContain("SDK or later and any apps or games");
    }
  });

  it.each(["1398x2034", "2007x2853"] as const)("adds the Duo guide, checker and rejection links on %s", (size) => {
    for (const locale of ["fr", "en"] as const) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      expect(html).toContain(`href="${localizedPath(locale, deviceGuidePath("iphone-duo"))}"`);
      expect(html).toContain(`href="${localizedPath(locale, SCREENSHOT_CHECKER_PATH)}"`);
      expect(html).toContain(`href="${rejectionPath(locale)}"`);
    }
  });

  it.each(["1398x2034", "2007x2853"] as const)("gives %s a FAQ (incl. April 2027 and the separate required slot) mirrored in the JSON-LD", (size) => {
    for (const locale of ["fr", "en"] as const) {
      const faq = sizeFaq(locale, size);
      expect(faq.length).toBeGreaterThanOrEqual(5);
      // The April 2027 and medium-display-separate questions are present.
      const questions = faq.map((item) => item.q).join(" ").toLowerCase();
      expect(questions).toMatch(locale === "fr" ? /avril 2027/ : /april 2027/);
      expect(questions).toMatch(locale === "fr" ? /écran moyen|medium display/ : /medium display/);
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      const faqNode = jsonLdFromHtml(html)["@graph"].find((node: { "@type": string }) => node["@type"] === "FAQPage");
      expect(faqNode.mainEntity.map((entity: { name: string }) => entity.name)).toEqual(faq.map((item) => item.q));
      expect(faqNode.mainEntity.map((entity: { acceptedAnswer: { text: string } }) => entity.acceptedAnswer.text)).toEqual(faq.map((item) => item.a));
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
        // The whole rendered page (slots table, timeline, FAQ included) never says both are required.
        const html = renderToStaticMarkup(createElement(SizePage, { locale, size })).toLowerCase();
        expect(html).not.toMatch(/both (iphone )?duo (sizes|screens|displays) (are )?required/);
        expect(html).not.toMatch(/les deux (tailles|écrans) duo (sont )?(requis|obligatoires)/);
      }
    }
  });
});
