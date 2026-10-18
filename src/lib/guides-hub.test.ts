import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Page, { generateMetadata } from "@/app/[locale]/guides/page";
import { generateImageMetadata, generateStaticParams } from "@/app/[locale]/guides/opengraph-image";
import sitemap from "@/app/sitemap";
import { I18nProvider } from "@/components/i18n-provider";
import { COMPARISONS, competitorComparison, comparisonPath } from "./comparisons";
import { listGuides } from "./guides";
import { getMessages, getTranslator } from "./i18n";
import { shouldSkipLocaleRewrite } from "./locale";
import { SCREENSHOT_CHECKER_PATH } from "./screenshot-checker";
import { SCREENSHOT_SIZES, sizePageCopy, SPECS_PAGE_COPY } from "./screenshot-pages";
import { absoluteUrl, localizedPath } from "./site";
import type { Locale } from "./specs";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

function escaped(text: string) {
  return renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
}

function contentGuides(locale: Locale) {
  const directory = path.join(process.cwd(), "content/guides");
  return readdirSync(directory).filter((file) => file.endsWith(`.${locale}.md`)).map((file) => {
    const source = readFileSync(path.join(directory, file), "utf8");
    const field = (name: string) => source.match(new RegExp(`^${name}: "?([^\\r\\n]+?)"?$`, "m"))![1];
    return { path: `/guides/${field("slug")}`, title: field("title"), description: field("description"), dateModified: field("updated") };
  });
}

describe.each(["fr", "en"] as const)("%s guides hub", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });
  const { t } = getTranslator(locale);

  it("lists every localized content guide, checker, size and comparison with its existing description", async () => {
    const html = renderToStaticMarkup(await Page(props()));
    const guides = contentGuides(locale);
    expect(guides.length).toBeGreaterThan(0);
    expect(listGuides(locale)).toEqual([...guides].sort((a, b) => a.title.localeCompare(b.title, locale)));
    const links = [
      ...guides,
      { path: SCREENSHOT_CHECKER_PATH, title: t("checker_title"), description: t("checker_description") },
      { path: "/specs", ...SPECS_PAGE_COPY[locale] },
      ...SCREENSHOT_SIZES.map((size) => ({ path: `/${size}`, ...sizePageCopy(locale, size) })),
      ...COMPARISONS.map(({ slug }) => ({ path: comparisonPath(slug), ...competitorComparison(locale, slug)! })),
    ];
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.match(/<section\b/g)).toHaveLength(4);
    expect(html.match(/<h2\b/g)).toHaveLength(4);
    expect(html.match(/<ul\b/g)).toHaveLength(4);
    expect(html.match(/<li\b/g)).toHaveLength(links.length);
    for (const link of links) {
      expect(html).toContain(`<a class="ds-link" href="${localizedPath(locale, link.path)}">${escaped(link.title)}</a>`);
      expect(html).toContain(`<p class="mt-1 text-[var(--muted)]">${escaped(link.description)}</p>`);
    }
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    expect(graph).toHaveLength(1);
    expect(graph[0]).toMatchObject({
      "@type": "TechArticle", headline: t("guides_title"), description: t("guides_description"),
      dateModified: guides.map((guide) => guide.dateModified).sort().at(-1),
      inLanguage: locale, url: absoluteUrl(localizedPath(locale, "/guides")),
    });
    for (const forbidden of ["5,4″", "7,6″", '5.4"', '7.6"', "APP_IPHONE_DUO", "exigée"]) {
      expect(html).not.toContain(forbidden);
      expect(html).not.toContain(escaped(forbidden));
    }
    // The existing specs/6.3-inch descriptions legitimately call that iPhone size required.
    for (const key of ["guides_title", "guides_description", "guides_guides", "guides_checker", "guides_sizes", "guides_comparisons", "footer_guides"] as const) {
      expect(t(key)).not.toMatch(/required|exigée/i);
    }
  });

  it("publishes concise, indexable metadata and reciprocal sitemap alternates", async () => {
    const metadata = await generateMetadata(props());
    const url = absoluteUrl(localizedPath(locale, "/guides"));
    const languages = { fr: absoluteUrl("/guides"), en: absoluteUrl("/en/guides"), "x-default": absoluteUrl("/guides") };
    expect(metadata.title).toBe(t("guides_title"));
    expect(metadata.description).toBe(t("guides_description"));
    expect(`${metadata.title} · DuoShot`.length).toBeLessThanOrEqual(60);
    expect(metadata.description!.length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical: url, languages });
    expect(sitemap().find((entry) => entry.url === url)).toMatchObject({ priority: 0.8, alternates: { languages } });
    expect(shouldSkipLocaleRewrite(localizedPath(locale, "/guides"))).toBe(true);
  });

  it("publishes a localized social card", () => {
    expect(generateStaticParams()).toContainEqual({ locale });
    expect(generateImageMetadata({ params: { locale } })).toMatchObject([{ alt: t("guides_description") }]);
  });
});

describe("guides footer link", () => {
  it.each(["fr", "en"] as const)("renders the real %s footer with the localized hub link", async (locale) => {
    const { SiteFooter } = await vi.importActual<typeof import("@/components/site-chrome")>("@/components/site-chrome");
    const html = renderToStaticMarkup(createElement(I18nProvider,
      { locale, messages: getMessages(locale) } as ComponentProps<typeof I18nProvider>,
      createElement(SiteFooter, { locale }),
    ));
    expect(html).toContain(`<a data-testid="footer-guides" href="${localizedPath(locale, "/guides")}">Guides</a>`);
  });
});
