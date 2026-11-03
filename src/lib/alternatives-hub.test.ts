import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HubPage, { generateMetadata } from "@/app/[locale]/alternatives/page";
import sitemap from "@/app/sitemap";
import { ALTERNATIVE_SLUGS, ALTERNATIVES_BASE_PATH, alternativePath } from "./alternatives";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

/** The visible breadcrumb names, read from the rendered <nav aria-label="Breadcrumb">. */
function visibleBreadcrumb(html: string): string[] {
  const nav = html.match(/aria-label="Breadcrumb"[\s\S]*?<\/nav>/)![0];
  return Array.from(nav.matchAll(/<(?:a[^>]*|span aria-current="page")>([^<]+)<\/(?:a|span)>/g)).map((match) => match[1]);
}

function breadcrumbGraph(html: string): { name: string }[] {
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
  return graph.find((node: { "@type": string }) => node["@type"] === "BreadcrumbList").itemListElement;
}

describe.each(["fr", "en"] as const)("%s alternatives hub", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });

  it("renders one h1 and links to each of the five alternatives", async () => {
    const html = renderToStaticMarkup(await HubPage(props()));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(ALTERNATIVE_SLUGS).toHaveLength(5);
    for (const slug of ALTERNATIVE_SLUGS) {
      expect(html, slug).toContain(`href="${localizedPath(locale, alternativePath(slug))}"`);
    }
  });

  it("emits a breadcrumb whose JSON-LD names match the visible breadcrumb", async () => {
    const html = renderToStaticMarkup(await HubPage(props()));
    const expected = [locale === "fr" ? "Accueil" : "Home", "Alternatives"];
    const visible = visibleBreadcrumb(html);
    expect(visible).toEqual(expected);
    expect(breadcrumbGraph(html).map((item) => item.name)).toEqual(visible);
  });

  it("publishes indexable, reciprocal metadata listed in the sitemap", async () => {
    const metadata = await generateMetadata(props());
    const canonical = absoluteUrl(localizedPath(locale, ALTERNATIVES_BASE_PATH));
    expect(metadata.robots).toBeUndefined();
    expect([...metadata.description!].length).toBeLessThanOrEqual(160);
    expect(metadata.alternates).toEqual({ canonical, languages: {
      fr: absoluteUrl(ALTERNATIVES_BASE_PATH), en: absoluteUrl(`/en${ALTERNATIVES_BASE_PATH}`), "x-default": absoluteUrl(ALTERNATIVES_BASE_PATH),
    } });
    expect(sitemap().some((entry) => entry.url === canonical)).toBe(true);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, ALTERNATIVES_BASE_PATH))).toBe(true);
  });
});
