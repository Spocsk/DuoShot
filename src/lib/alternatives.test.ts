import { readFileSync } from "node:fs";
import nodePath from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AlternativeRoute, { dynamicParams, generateMetadata, generateStaticParams } from "@/app/[locale]/alternatives/[slug]/page";
import sitemap from "@/app/sitemap";
import { ALTERNATIVES, ALTERNATIVE_SLUGS, alternativePage, alternativePath } from "./alternatives";
import { competitorComparison, comparisonPath } from "./comparisons";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

const SOURCES = readFileSync(nodePath.join(process.cwd(), "docs/sources/competitors-2026-11-03.md"), "utf8");

/** Every text field authored for one locale, so we can audit the copy as a whole. */
function localeCopy(locale: "fr" | "en", slug: string) {
  const view = alternativePage(locale, slug)!;
  return [
    view.title, view.description, view.answer, view.updatedLabel, view.tableCaption,
    view.columns.label, view.columns.duoshot, view.columns.competitor,
    ...view.rows.flatMap((row) => [row.label, row.duoshot, row.competitor]),
    view.strengthsHeading, ...view.strengths,
    view.whenToChooseHeading, view.whenToChoose,
    view.faqHeading, ...view.faq.flatMap((item) => [item.q, item.a]),
    view.relatedHeading, ...view.breadcrumb.map((crumb) => crumb.name),
  ].join("\n");
}

describe("alternative-to pages", () => {
  it("declares exactly the five expected slugs with no duplicates", () => {
    expect(ALTERNATIVE_SLUGS).toEqual(["appscreens", "applaunchpad", "screenshots-pro", "appmockup", "hotpot"]);
    expect(new Set(ALTERNATIVE_SLUGS).size).toBe(ALTERNATIVE_SLUGS.length);
    expect(generateStaticParams()).toEqual(ALTERNATIVE_SLUGS.map((slug) => ({ slug })));
    expect(dynamicParams).toBe(false);
  });

  it("gives every entry sources and the checked date 2026-11-03", () => {
    for (const entry of ALTERNATIVES) {
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) expect(source).toMatch(/^https:\/\//);
      expect(entry.checked).toBe("2026-11-03");
    }
  });

  it("returns null for an unknown slug and 404s the route", async () => {
    expect(alternativePage("fr", "unknown")).toBeNull();
    for (const params of [{ locale: "fr", slug: "unknown" }, { locale: "de", slug: ALTERNATIVE_SLUGS[0] }]) {
      await expect(generateMetadata({ params: Promise.resolve(params) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      await expect(AlternativeRoute({ params: Promise.resolve(params) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    }
  });

  describe.each(["fr", "en"] as const)("%s", (locale) => {
    it("uses « vous » and never the informal « tu » in French copy", () => {
      for (const slug of ALTERNATIVE_SLUGS) {
        const copy = localeCopy(locale, slug);
        if (locale === "fr") {
          expect(copy).toContain("vous");
          expect(copy).not.toContain("tu ");
        }
      }
    });

    it("never claims both iPhone Duo sizes are required", async () => {
      for (const slug of ALTERNATIVE_SLUGS) {
        const html = renderToStaticMarkup(await AlternativeRoute({ params: Promise.resolve({ locale, slug }) }));
        expect(html).not.toMatch(/both[^.]*(?:duo )?sizes[^.]*required/i);
        expect(html).not.toMatch(/les deux tailles[^.]*requis/i);
      }
    });

    it.each(ALTERNATIVE_SLUGS)("only shows dollar prices that exist verbatim in the sources for %s", async (slug) => {
      const html = renderToStaticMarkup(await AlternativeRoute({ params: Promise.resolve({ locale, slug }) }));
      const dollars = html.match(/\$\d+(?:[.,]\d+)*/g) ?? [];
      for (const price of dollars) expect(SOURCES, `missing ${price}`).toContain(price);
    });

    it.each(ALTERNATIVE_SLUGS)("renders one h1, a comparison table, sources, updated date and the direct answer for %s", async (slug) => {
      const view = alternativePage(locale, slug)!;
      const html = renderToStaticMarkup(await AlternativeRoute({ params: Promise.resolve({ locale, slug }) }));
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(`>${view.title}</h1>`);
      expect(html).toContain("<table");
      expect(html).toContain(view.answer);
      expect(html).toContain(locale === "fr" ? "Mis à jour le 3 novembre 2026" : "Updated November 3, 2026");
      for (const source of view.sources) expect(html).toContain(`href="${source}"`);
      // Honest DuoShot workflow note never claims the upload was tested.
      expect(html).toContain(locale === "fr" ? "n’a pas été testé par DuoShot" : "has not been tested by DuoShot");
      // Links to the tool, pricing and specs; plus the matching "vs" page when one exists.
      for (const target of ["/tool", "/pricing", "/specs"]) expect(html).toContain(`href="${localizedPath(locale, target)}"`);
      if (view.comparisonSlug) expect(html).toContain(`href="${localizedPath(locale, comparisonPath(view.comparisonSlug))}"`);
    });

    it.each(ALTERNATIVE_SLUGS)("emits breadcrumb and FAQ structured data matching the visible copy for %s", async (slug) => {
      const view = alternativePage(locale, slug)!;
      const html = renderToStaticMarkup(await AlternativeRoute({ params: Promise.resolve({ locale, slug }) }));
      const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
      expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["TechArticle", "FAQPage", "BreadcrumbList"]);
      const breadcrumb = graph[2].itemListElement;
      expect(breadcrumb.map((item: { name: string }) => item.name)).toEqual(view.breadcrumb.map((crumb) => crumb.name));
      expect(breadcrumb[1].item).toBe(absoluteUrl(localizedPath(locale, alternativePath(slug))));
      const faq = graph[1].mainEntity;
      expect(faq).toHaveLength(view.faq.length);
      expect(faq).toHaveLength(3);
      faq.forEach((node: { name: string; acceptedAnswer: { text: string } }, index: number) => {
        expect(node.name).toBe(view.faq[index].q);
        expect(node.acceptedAnswer.text).toBe(view.faq[index].a);
        expect(html).toContain(view.faq[index].q);
      });
    });

    it.each(ALTERNATIVE_SLUGS)("keeps metadata reciprocal, indexable and discoverable in the sitemap for %s", async (slug) => {
      const path = alternativePath(slug);
      const view = alternativePage(locale, slug)!;
      const canonical = absoluteUrl(localizedPath(locale, path));
      const metadata = await generateMetadata({ params: Promise.resolve({ locale, slug }) });
      expect(metadata.title).toBe(view.title);
      expect(metadata.description).toBe(view.description);
      expect([...view.description].length).toBeLessThanOrEqual(160);
      expect(metadata.robots).toBeUndefined();
      expect(metadata.alternates).toEqual({ canonical, languages: {
        fr: absoluteUrl(path), en: absoluteUrl(`/en${path}`), "x-default": absoluteUrl(path),
      } });
      expect(sitemap().find((entry) => entry.url === canonical)?.alternates).toEqual({ languages: metadata.alternates?.languages });
      expect(shouldSkipLocaleRewrite(localizedPath(locale, path))).toBe(true);
      // FR titles keep « générateur »; EN keeps "generator".
      expect(view.title.toLowerCase()).toContain(locale === "fr" ? "générateur" : "generator");
    });
  });

  it("links back from the matching DuoShot vs pages to the alternative page", () => {
    for (const locale of ["fr", "en"] as const) {
      for (const entry of ALTERNATIVES) {
        if (!entry.comparisonSlug) continue;
        const body = competitorComparison(locale, entry.comparisonSlug)!.body;
        expect(body).toContain(`](${localizedPath(locale, alternativePath(entry.slug))})`);
      }
    }
  });
});
