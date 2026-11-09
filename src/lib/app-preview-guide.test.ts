import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "@/app/[locale]/guides/app-preview-specifications/page";
import { generateImageMetadata, generateStaticParams } from "@/app/[locale]/guides/app-preview-specifications/opengraph-image";
import sitemap from "@/app/sitemap";
import { GET as llms } from "@/app/llms.txt/route";
import { appPreviewGuide, APP_PREVIEW_GUIDE_PATH } from "./guides";
import { ARTICLE_AUTHOR } from "./json-ld";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s App Store app preview specs guide", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });
  const url = () => absoluteUrl(localizedPath(locale, APP_PREVIEW_GUIDE_PATH));

  it("publishes indexable localized metadata, reciprocal hreflang and a sitemap entry", async () => {
    const guide = appPreviewGuide(locale);
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe(guide.title);
    expect(metadata.description).toBe(guide.description);
    expect(guide.description.length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical: url(), languages: {
      fr: absoluteUrl(APP_PREVIEW_GUIDE_PATH), en: absoluteUrl(`/en${APP_PREVIEW_GUIDE_PATH}`), "x-default": absoluteUrl(APP_PREVIEW_GUIDE_PATH),
    } });
    expect(sitemap().find((entry) => entry.url === url())?.alternates?.languages).toEqual(metadata.alternates?.languages);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, APP_PREVIEW_GUIDE_PATH))).toBe(true);
  });

  it("server renders one H1, the accepted Duo preview size, the screenshots-only note and locale-correct links", async () => {
    const guide = appPreviewGuide(locale);
    const html = renderToStaticMarkup(await GuidePage(props()));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    // The accepted iPhone/iPhone Duo app preview resolution, taken straight from Apple.
    expect(html).toContain("886 × 1920");
    // DuoShot makes the screenshots, not the preview videos.
    expect(html).toContain(locale === "fr" ? "il ne crée pas les vidéos d’aperçu" : "it doesn't make app preview videos");
    for (const link of guide.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const href = link[1];
      expect(html).toContain(`href="${href}"`);
      if (href.startsWith("/")) expect(href === "/en" || href.startsWith("/en/")).toBe(locale === "en");
    }
  });

  it("emits a TechArticle authored by the named person with no FAQ or HowTo", async () => {
    const guide = appPreviewGuide(locale);
    const html = renderToStaticMarkup(await GuidePage(props()));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["TechArticle"]);
    expect(graph[0]).toMatchObject({
      "@type": "TechArticle", headline: guide.title, description: guide.description,
      inLanguage: locale, url: url(), dateModified: "2026-11-09", datePublished: "2026-11-09",
      author: { "@type": "Person", name: ARTICLE_AUTHOR },
    });
  });

  it("is listed in llms.txt in both locales", async () => {
    const body = await llms().text();
    expect(body).toContain(`${absoluteUrl("/guides/app-preview-specifications")}`);
    expect(body).toContain(`${absoluteUrl("/en/guides/app-preview-specifications")}`);
  });

  it("publishes a localized social image", () => {
    expect(generateStaticParams()).toEqual([{ locale: "fr" }, { locale: "en" }]);
    expect(generateImageMetadata({ params: { locale } })).toEqual([{
      id: "card",
      alt: locale === "fr"
        ? "Spécifications des aperçus vidéo App Store : tailles acceptées par appareil dont l’iPhone Duo, 15–30 s, 500 Mo et l’encodage H.264 ou ProRes."
        : "App Store app preview specs: accepted video sizes per device including iPhone Duo, 15–30 s, 500 MB and H.264 or ProRes encoding.",
      size: { width: 1200, height: 630 }, contentType: "image/png",
    }]);
  });
});
