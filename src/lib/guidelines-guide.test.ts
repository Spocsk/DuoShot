import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "@/app/[locale]/guides/app-store-screenshot-guidelines/page";
import { generateImageMetadata, generateStaticParams } from "@/app/[locale]/guides/app-store-screenshot-guidelines/opengraph-image";
import sitemap from "@/app/sitemap";
import { GET as llms } from "@/app/llms.txt/route";
import { guidelinesGuide, GUIDELINES_GUIDE_PATH } from "./guides";
import { ARTICLE_AUTHOR } from "./json-ld";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s App Store screenshot guidelines guide", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });
  const url = () => absoluteUrl(localizedPath(locale, GUIDELINES_GUIDE_PATH));

  it("publishes indexable localized metadata, reciprocal hreflang and a sitemap entry", async () => {
    const guide = guidelinesGuide(locale);
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe(guide.title);
    expect(metadata.description).toBe(guide.description);
    expect(`${guide.title} · DuoShot`.length).toBeLessThanOrEqual(60);
    expect(guide.description.length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical: url(), languages: {
      fr: absoluteUrl(GUIDELINES_GUIDE_PATH), en: absoluteUrl(`/en${GUIDELINES_GUIDE_PATH}`), "x-default": absoluteUrl(GUIDELINES_GUIDE_PATH),
    } });
    expect(sitemap().find((entry) => entry.url === url())?.alternates?.languages).toEqual(metadata.alternates?.languages);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, GUIDELINES_GUIDE_PATH))).toBe(true);
  });

  it("server renders one H1, the Apple guideline references and locale-correct links", async () => {
    const guide = guidelinesGuide(locale);
    const html = renderToStaticMarkup(await GuidePage(props()));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const ref of ["2.3.3", "2.3.7", "2.3.8", "2.3.9", "2.3.10", "2.3.1"]) expect(html).toContain(ref);
    // The file rules never claim both Duo sizes are mandatory, only that Duo screenshots become required.
    expect(html).toContain(locale === "fr"
      ? "requises à partir d’avril 2027 pour toute app utilisant le SDK iOS 27.1"
      : "required starting in April 2027 for any app using the iOS 27.1 SDK");
    for (const link of guide.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const href = link[1];
      expect(html).toContain(`href="${href}"`);
      if (href.startsWith("/")) expect(href === "/en" || href.startsWith("/en/")).toBe(locale === "en");
    }
  });

  it("emits a TechArticle authored by the named person with no FAQ or HowTo", async () => {
    const guide = guidelinesGuide(locale);
    const html = renderToStaticMarkup(await GuidePage(props()));
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["TechArticle"]);
    expect(graph[0]).toMatchObject({
      "@type": "TechArticle", headline: guide.title, description: guide.description,
      inLanguage: locale, url: url(), dateModified: "2026-11-04", datePublished: "2026-11-04",
      author: { "@type": "Person", name: ARTICLE_AUTHOR },
    });
  });

  it("is listed in llms.txt in both locales", async () => {
    const body = await llms().text();
    expect(body).toContain(`${absoluteUrl("/guides/app-store-screenshot-guidelines")}`);
    expect(body).toContain(`${absoluteUrl("/en/guides/app-store-screenshot-guidelines")}`);
  });

  it("publishes a localized social image", () => {
    expect(generateStaticParams()).toEqual([{ locale: "fr" }, { locale: "en" }]);
    expect(generateImageMetadata({ params: { locale } })).toEqual([{
      id: "card",
      alt: locale === "fr"
        ? "Règles des captures App Store : les lignes de l’App Review (2.3.3, 2.3.7 à 2.3.10) et les règles de fichier qui causent des refus."
        : "App Store screenshot guidelines: the App Review lines (2.3.3, 2.3.7 to 2.3.10) and the file rules that cause rejections.",
      size: { width: 1200, height: 630 }, contentType: "image/png",
    }]);
  });
});
