import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "@/app/[locale]/guides/best-app-store-screenshot-generator/page";
import { SpecsPage } from "@/components/specs-page";
import { GuideMarkdown } from "@/components/guide-markdown";
import sitemap from "@/app/sitemap";
import { comparisonGuide, COMPARISON_GUIDE_PATH } from "./guides";
import { absoluteUrl, localizedPath } from "./site";
import { shouldSkipLocaleRewrite } from "./locale";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s comparison guide", (locale) => {
  it("publishes indexable metadata with reciprocal languages and a matching sitemap entry", async () => {
    const guide = comparisonGuide(locale);
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    const canonical = absoluteUrl(localizedPath(locale, COMPARISON_GUIDE_PATH));
    expect(metadata.title).toBe(guide.title);
    expect(metadata.description).toBe(guide.description);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical, languages: {
      fr: absoluteUrl(COMPARISON_GUIDE_PATH),
      en: absoluteUrl(`/en${COMPARISON_GUIDE_PATH}`),
      "x-default": absoluteUrl(COMPARISON_GUIDE_PATH),
    } });
    expect(metadata.openGraph).toMatchObject({ url: canonical, description: guide.description });
    expect(metadata.twitter).toMatchObject({ description: guide.description });
    expect(sitemap().find((entry) => entry.url === canonical)?.alternates).toEqual({ languages: metadata.alternates?.languages });
    expect(shouldSkipLocaleRewrite(localizedPath(locale, COMPARISON_GUIDE_PATH))).toBe(true);
  });

  it("renders the complete article on the server with headings, table, formatting and working links", async () => {
    const guide = comparisonGuide(locale);
    const html = renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ locale }) }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain("alternate:");
    expect(html).not.toContain("**");
    expect(html).toContain("<table");
    expect(html.match(/scope="col"/g)).toHaveLength(6);
    expect(html.match(/scope="row"/g)).toHaveLength(10);
    for (const heading of guide.body.matchAll(/^#{1,3} (.+)$/gm)) {
      const escaped = renderToStaticMarkup(createElement("span", null, heading[1])).slice(6, -7);
      expect(html).toContain(`>${escaped}</h`);
    }
    for (const link of guide.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) expect(html).toContain(`href="${link[1]}"`);
    expect(html).toContain('href="https://www.screenpane.com/"');
    expect(html).toContain(locale === "fr" ? "Pass, Indie et Studio" : "Pass, Indie and Studio");
    const article = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"].find((node: { "@type": string }) => node["@type"] === "TechArticle");
    expect(article).toMatchObject({ headline: guide.title, description: guide.description, dateModified: "2026-10-15", inLanguage: locale });
  });

  it("is linked from the existing specs page in its own language", () => {
    const html = renderToStaticMarkup(createElement(SpecsPage, { locale }));
    expect(html).toContain(`href="${localizedPath(locale, COMPARISON_GUIDE_PATH)}"`);
    expect(html).toContain(comparisonGuide(locale).title);
  });
});

it("escapes raw HTML and does not turn unsafe URLs into links", () => {
  const html = renderToStaticMarkup(createElement(GuideMarkdown, { body: '<script>alert(1)</script> **safe** [bad](javascript:alert)' }));
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('href=');
  expect(html).toContain('<strong>safe</strong>');
});

it("rejects unsupported locales", async () => {
  await expect(generateMetadata({ params: Promise.resolve({ locale: "de" }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
