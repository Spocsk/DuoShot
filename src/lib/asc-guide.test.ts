import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "@/app/[locale]/guides/iphone-duo-app-store-connect/page";
import ComparisonPage from "@/app/[locale]/guides/best-app-store-screenshot-generator/page";
import sitemap from "@/app/sitemap";
import { GET as llms } from "@/app/llms.txt/route";
import { SpecsPage } from "@/components/specs-page";
import { ascGuideCopy } from "./asc-guide-copy";
import { appStoreConnectGuide, ASC_GUIDE_PATH } from "./guides";
import { jsonLdGraph } from "./json-ld";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";
import { DUO_SLOT_COPY } from "./apple-screenshot-status";
import { generateImageMetadata, generateStaticParams } from "@/app/[locale]/guides/iphone-duo-app-store-connect/opengraph-image";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

function escaped(text: string) {
  return renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
}

describe.each(["fr", "en"] as const)("%s App Store Connect guide", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });
  const url = () => absoluteUrl(localizedPath(locale, ASC_GUIDE_PATH));

  it("publishes indexable localized metadata, reciprocal hreflang and a sitemap entry", async () => {
    const guide = appStoreConnectGuide(locale);
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe(guide.title);
    expect(metadata.description).toBe(guide.description);
    expect(`${guide.title} · DuoShot`.length).toBeLessThanOrEqual(60);
    expect(guide.description.length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical: url(), languages: {
      fr: absoluteUrl(ASC_GUIDE_PATH), en: absoluteUrl(`/en${ASC_GUIDE_PATH}`), "x-default": absoluteUrl(ASC_GUIDE_PATH),
    } });
    expect(metadata.openGraph).toMatchObject({ url: url(), description: guide.description });
    expect(metadata.twitter).toMatchObject({ description: guide.description });
    expect(sitemap().find((entry) => entry.url === url())?.alternates?.languages).toEqual(metadata.alternates?.languages);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, ASC_GUIDE_PATH))).toBe(true);
  });

  it("server renders the sizes, correct slots, manual steps and explicit untested status", async () => {
    const html = renderToStaticMarkup(await GuidePage(props()));
    const guide = appStoreConnectGuide(locale);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`<h1 class="font-display text-4xl sm:text-5xl">${escaped(guide.title)}</h1>`);
    expect(html).toContain("<table");
    for (const size of ["1398 × 2034", "2007 × 2853", "2034 × 1398", "2853 × 2007", "1206 × 2622", "1320 × 2868"]) expect(html).toContain(size);
    expect(html).toContain('href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications"');
    expect(guide.body).toContain(locale === "fr"
      ? "avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur"
      : "April 2027 for apps built with the iOS 27.1 SDK or later");
    expect(guide.body).toContain(locale === "fr" ? "de 1 à 10 captures" : "1 to 10 screenshots");
    expect(html).toContain(escaped(DUO_SLOT_COPY[locale]));
    expect(html).toContain(locale === "fr" ? "2 ZIP HD" : "2 HD ZIPs");
    expect(html).toContain(locale === "fr" ? "Pass, Indie et Studio" : "Pass, Indie and Studio");
    expect(html).toContain(locale === "fr" ? "connecteur automatique expérimental" : "experimental automatic connector");
    for (const link of guide.body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      expect(html).toContain(`href="${link[1]}"`);
      if (link[1].startsWith("/")) expect(link[1].startsWith("/en/")).toBe(locale === "en");
    }
  });

  it("matches HowTo and FAQ JSON-LD to all displayed steps, anchors, questions and answers", async () => {
    const html = renderToStaticMarkup(await GuidePage(props()));
    const copy = ascGuideCopy(locale);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["Organization", "TechArticle", "HowTo", "FAQPage"]);
    expect(graph[1]).toMatchObject({ headline: appStoreConnectGuide(locale).title, dateModified: "2026-10-16", inLanguage: locale, url: url() });
    expect(graph[2]).toMatchObject({ name: copy.howToHeading, inLanguage: locale, url: url() });
    expect(graph[2].step).toHaveLength(copy.steps.length);
    copy.steps.forEach((step, index) => {
      expect(graph[2].step[index]).toEqual({ "@type": "HowToStep", position: index + 1, name: step.name, text: step.text, url: `${url()}#${step.id}` });
      expect(html).toContain(`<li id="${step.id}"><h3 class="font-display text-2xl">${escaped(step.name)}</h3><p class="mt-3 leading-relaxed">${escaped(step.text)}</p></li>`);
    });
    expect(graph[3].mainEntity).toHaveLength(copy.faq.length);
    copy.faq.forEach((item, index) => {
      expect(graph[3].mainEntity[index]).toEqual({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } });
      expect(html).toContain(`<span>${escaped(item.q)}</span>`);
      expect(html).toContain(`<p class="max-w-3xl pb-4 text-[var(--muted)]">${escaped(item.a)}</p>`);
    });
  });

  it("is discoverable from specs, the comparison guide and llms.txt", async () => {
    const href = `href="${localizedPath(locale, ASC_GUIDE_PATH)}"`;
    expect(renderToStaticMarkup(createElement(SpecsPage, { locale }))).toContain(href);
    expect(renderToStaticMarkup(await ComparisonPage(props()))).toContain(href);
    expect(await llms().text()).toContain(url());
  });

  it("publishes a localized social image", () => {
    expect(generateStaticParams()).toEqual([{ locale: "fr" }, { locale: "en" }]);
    expect(generateImageMetadata({ params: { locale } })).toEqual([{
      id: "card", alt: expect.stringContaining("iPhone Duo"),
      size: { width: 1200, height: 630 }, contentType: "image/png",
    }]);
  });
});

it("omits HowTo when steps are absent or empty", () => {
  for (const howTo of [undefined, { name: "Empty", steps: [] }]) {
    expect(jsonLdGraph("en", { path: ASC_GUIDE_PATH, howTo })["@graph"].some((node) => node["@type"] === "HowTo")).toBe(false);
  }
});

it("rejects unsupported guide locales", async () => {
  await expect(generateMetadata({ params: Promise.resolve({ locale: "de" }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
