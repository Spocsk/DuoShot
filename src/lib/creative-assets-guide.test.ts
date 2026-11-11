import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "@/app/[locale]/guides/app-store-creative-assets/page";
import { generateImageMetadata, generateStaticParams } from "@/app/[locale]/guides/app-store-creative-assets/opengraph-image";
import sitemap from "@/app/sitemap";
import { GET as llms } from "@/app/llms.txt/route";
import { creativeAssetsGuide, CREATIVE_ASSETS_GUIDE_PATH } from "./guides";
import { creativeAssetsGuideCopy } from "./creative-assets-guide-copy";
import { APPLE_CREATIVE_ASSETS_SOURCE } from "./apple-screenshot-status";
import { ARTICLE_AUTHOR } from "./json-ld";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s App Store creative assets guide", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });
  const url = () => absoluteUrl(localizedPath(locale, CREATIVE_ASSETS_GUIDE_PATH));

  it("publishes indexable localized metadata, reciprocal hreflang and a sitemap entry", async () => {
    const guide = creativeAssetsGuide(locale);
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe(guide.title);
    expect(metadata.description).toBe(guide.description);
    expect(guide.description.length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical: url(), languages: {
      fr: absoluteUrl(CREATIVE_ASSETS_GUIDE_PATH), en: absoluteUrl(`/en${CREATIVE_ASSETS_GUIDE_PATH}`), "x-default": absoluteUrl(CREATIVE_ASSETS_GUIDE_PATH),
    } });
    expect(sitemap().find((entry) => entry.url === url())?.alternates?.languages).toEqual(metadata.alternates?.languages);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, CREATIVE_ASSETS_GUIDE_PATH))).toBe(true);
  });

  it("server renders one H1, the header size, the screenshots-only note and locale-correct links", async () => {
    const guide = creativeAssetsGuide(locale);
    const html = renderToStaticMarkup(await GuidePage(props()));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    // The product page header size, taken straight from Apple.
    expect(html).toContain("3840 × 1646");
    // DuoShot makes the screenshots, not the creative assets. React escapes the ASCII apostrophe
    // in "doesn't" to &#x27;, so decode entities before asserting on the sentence.
    const text = html.replace(/&#x27;/g, "'");
    expect(text).toContain(locale === "fr" ? "DuoShot ne crée pas les creative assets" : "DuoShot doesn't make creative assets");
    for (const link of guide.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const href = link[1];
      expect(html).toContain(`href="${href}"`);
      if (href.startsWith("/")) expect(href === "/en" || href.startsWith("/en/")).toBe(locale === "en");
    }
  });

  it("emits a TechArticle and a FAQPage, authored by the named person, citing Apple's creative assets page", async () => {
    const guide = creativeAssetsGuide(locale);
    const copy = creativeAssetsGuideCopy(locale);
    const html = renderToStaticMarkup(await GuidePage(props()));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["TechArticle", "FAQPage"]);
    expect(graph[0]).toMatchObject({
      "@type": "TechArticle", headline: guide.title, description: guide.description,
      inLanguage: locale, url: url(), dateModified: "2026-11-11", datePublished: "2026-11-11",
      author: { "@type": "Person", name: ARTICLE_AUTHOR },
      // This guide cites Apple's creative assets specifications page, not the screenshot one.
      citation: APPLE_CREATIVE_ASSETS_SOURCE,
    });
    expect(graph[1].mainEntity.map((node: { name: string }) => node.name)).toEqual(copy.faq.map((item) => item.q));
    expect(APPLE_CREATIVE_ASSETS_SOURCE).toBe("https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications");
  });

  it("is listed in llms.txt in both locales", async () => {
    const body = await llms().text();
    expect(body).toContain(`${absoluteUrl("/guides/app-store-creative-assets")}`);
    expect(body).toContain(`${absoluteUrl("/en/guides/app-store-creative-assets")}`);
  });

  it("publishes a localized social image", () => {
    expect(generateStaticParams()).toEqual([{ locale: "fr" }, { locale: "en" }]);
    expect(generateImageMetadata({ params: { locale } })).toEqual([{
      id: "card",
      alt: locale === "fr"
        ? "Spécifications des creative assets App Store : bandeau de fiche 3840 × 1646, résultats de recherche 3:2, vidéo 5–30 s et règles de contenu d’Apple."
        : "App Store creative assets specs: product page header 3840 × 1646, search results 3:2, 5–30 s video and Apple's content rules.",
      size: { width: 1200, height: 630 }, contentType: "image/png",
    }]);
  });
});
