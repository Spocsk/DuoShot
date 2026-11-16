import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DevicePage } from "@/components/device-page";
import {
  DEVICE_VERIFIED_ON,
  IPHONE_DUO_GUIDE_VERIFIED_ON,
  deviceBySlug,
} from "./devices";
import { BADGE, NEWS_APRIL, REQUIRED, SPECS_APRIL } from "./iphone-duo-guide";
import { sizeEnrichment } from "./size-enrichment";
import { sizesGuideCopy } from "./sizes-guide-copy";
import { rejectionPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

const duo = deviceBySlug("iphone-duo")!;
const LOCALES = ["fr", "en"] as const;

/** The single application/ld+json graph DevicePage emits, parsed back from the rendered HTML. */
function jsonLdFromHtml(html: string) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("no JSON-LD script found");
  return JSON.parse(match[1]);
}

const nodeOf = (html: string, type: string) =>
  jsonLdFromHtml(html)["@graph"].find((node: { "@type": string }) => node["@type"] === type);

/** The two faithful Apple-accuracy FAQ questions added to the Duo guide. */
const NEW_FAQ = {
  fr: [
    "App Store Connect met-il mes captures à l’échelle vers les tailles iPhone Duo ?",
    "Les captures iPhone Duo remplacent-elles les captures écran moyen requises ?",
  ],
  en: [
    "Will App Store Connect scale my screenshots to iPhone Duo sizes?",
    "Do iPhone Duo screenshots replace the required medium display screenshots?",
  ],
} as const;

describe("iPhone Duo device guide: Apple accuracy", () => {
  it.each(LOCALES)("quotes Apple's badge verbatim and never says the app is optimized in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    expect(html).toContain(BADGE);
    expect(html).not.toContain("optimized");
    expect(html).not.toContain("optimisé");
  });

  it.each(LOCALES)("quotes Apple's two April 2027 wordings separately, never merged, in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    expect(html).toContain(SPECS_APRIL);
    expect(html).toContain(NEWS_APRIL);
    // The old, merged paraphrase must be gone.
    expect(html).not.toContain("iPhone Duo screenshots will be required for any app");
  });

  it.each(LOCALES)("keeps the Duo guide free of reject/rejet/refus except the rejection link href in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    // The only allowed occurrence is the link to the rejection page: its href (the label itself has no such word).
    const rejectLink = `href="${rejectionPath(locale)}"`;
    expect(html).toContain(rejectLink);
    const remainder = html.split(rejectLink).join("");
    expect(remainder).not.toMatch(/reject|rejet|refus/i);
    // The old flatten wording is gone in both locales.
    expect(html).not.toContain("pixels look opaque");
    expect(html).not.toContain("semblent opaques");
  });

  it.each(LOCALES)("lists the two new Apple-accuracy FAQ questions in the FAQPage JSON-LD in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    const faqNode = nodeOf(html, "FAQPage");
    const questions = faqNode.mainEntity.map((entity: { name: string }) => entity.name);
    for (const q of NEW_FAQ[locale]) expect(questions).toContain(q);
    // Both the REQUIRED and the scaling-note quotes feed the answers.
    const answers = faqNode.mainEntity.map((entity: { acceptedAnswer: { text: string } }) => entity.acceptedAnswer.text).join(" ");
    expect(answers).toContain(REQUIRED);
  });

  it.each(LOCALES)("shows the iPhone Duo guide's own verification date and dateModified in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: duo }));
    const label = locale === "en" ? "Verified on" : "Vérifié le";
    expect(html).toContain(`${label} ${IPHONE_DUO_GUIDE_VERIFIED_ON}`);
    const article = nodeOf(html, "TechArticle");
    expect(article.dateModified).toBe(IPHONE_DUO_GUIDE_VERIFIED_ON);
    expect(article.datePublished).toBe(DEVICE_VERIFIED_ON);
  });

  it.each(LOCALES)("keeps another device guide on the shared verification date in %s", (locale) => {
    const other = deviceBySlug("iphone-16-pro")!;
    const html = renderToStaticMarkup(createElement(DevicePage, { locale, device: other }));
    const label = locale === "en" ? "Verified on" : "Vérifié le";
    expect(html).toContain(`${label} ${DEVICE_VERIFIED_ON}`);
    expect(html).not.toContain(IPHONE_DUO_GUIDE_VERIFIED_ON);
    expect(nodeOf(html, "TechArticle").dateModified).toBe(DEVICE_VERIFIED_ON);
  });

  it.each(LOCALES)("keeps the sizes-guide Duo FAQ free of the optimized wording in %s", (locale) => {
    const faqText = sizesGuideCopy(locale).faq.map((item) => `${item.q} ${item.a}`).join(" ");
    expect(faqText).not.toContain("optimized");
    expect(faqText).not.toContain("optimisée");
    // It now quotes the badge verbatim instead.
    expect(faqText).toContain(BADGE);
  });

  it.each(LOCALES)("keeps the app-store-screenshot-sizes guide faithful to Apple in %s", (locale) => {
    const markdown = readFileSync(
      path.join(process.cwd(), `content/guides/app-store-screenshot-sizes.${locale}.md`),
      "utf8",
    );
    expect(markdown).not.toContain("optimized for iPhone Duo");
    expect(markdown).not.toContain("optimisée pour l’iPhone Duo");
    expect(markdown).not.toContain("optimisé");
    expect(markdown).not.toContain("look opaque");
    expect(markdown).not.toContain("semblent opaques");
    expect(markdown).not.toContain("is refused");
    expect(markdown).not.toContain("suffit à un refus");
    expect(markdown).toContain("made for iPhone Duo");
  });

  it.each(LOCALES)("keeps the 1206x2622 enrichment copy free of reject/rejet/refus in %s", (locale) => {
    const enrich = sizeEnrichment(locale, "1206x2622");
    const values = [
      enrich.devices.body,
      enrich.orientation.body,
      enrich.rejections.heading,
      enrich.rejections.intro,
      ...enrich.rejections.items,
      ...(enrich.slots
        ? [
            enrich.slots.heading,
            ...enrich.slots.columns,
            enrich.slots.source,
            enrich.slots.note,
            ...enrich.slots.rows.flatMap((row) => [row.group, row.status, ...row.sizes.map((part) => part.text)]),
          ]
        : []),
      ...(enrich.related ? [enrich.related.duoGuide, enrich.related.checker, enrich.related.rejection] : []),
    ].join(" ");
    expect(values).not.toMatch(/reject|rejet|refus/i);
  });
});
