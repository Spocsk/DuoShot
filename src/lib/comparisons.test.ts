import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ComparisonPage, { generateMetadata, generateStaticParams } from "@/app/[locale]/guides/[slug]/page";
import sitemap from "@/app/sitemap";
import { COMPARISONS, competitorComparison, comparisonPath } from "./comparisons";
import { comparisonGuide } from "./guides";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s competitor comparisons", (locale) => {
  for (const { slug, name, url } of COMPARISONS) {
    it(`serves ${name} with reciprocal metadata, sitemap discovery and a localized guide link`, async () => {
      const path = comparisonPath(slug);
      const guide = competitorComparison(locale, slug)!;
      const canonical = absoluteUrl(localizedPath(locale, path));
      const metadata = await generateMetadata({ params: Promise.resolve({ locale, slug }) });
      expect(metadata.title).toBe(guide.title);
      expect(metadata.description).toBe(guide.description);
      expect(metadata.robots).toBeUndefined();
      expect(metadata.alternates).toEqual({ canonical, languages: {
        fr: absoluteUrl(path), en: absoluteUrl(`/en${path}`), "x-default": absoluteUrl(path),
      } });
      expect(metadata.openGraph).toMatchObject({ url: canonical, description: guide.description });
      expect(metadata.twitter).toMatchObject({ description: guide.description });
      expect(sitemap().find((entry) => entry.url === canonical)?.alternates).toEqual({ languages: metadata.alternates?.languages });
      expect(shouldSkipLocaleRewrite(localizedPath(locale, path))).toBe(true);
      expect(comparisonGuide(locale).body).toContain(`[DuoShot vs ${name}](${localizedPath(locale, path)})`);
    });

    it(`renders ${name} sources, accurate DuoShot offers and the untested upload status on the server`, async () => {
      const guide = competitorComparison(locale, slug)!;
      const html = renderToStaticMarkup(await ComparisonPage({ params: Promise.resolve({ locale, slug }) }));
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(`>${guide.title}</h1>`);
      expect(html).toContain(`<table`);
      expect(html).toContain(`href="${url}"`);
      expect(html).not.toContain("**");
      expect(guide.body.split("\n\n")[1]).toMatch(/^DuoShot \(duoshot\.site\) /);
      expect(html).toContain("DuoShot (duoshot.site)");
      const duoDefinition = locale === "fr" ? "iPhone Duo (le téléphone pliable d'Apple)" : "iPhone Duo (Apple's foldable iPhone)";
      const firstMention = guide.body.indexOf("iPhone Duo");
      expect(firstMention).toBeLessThan(guide.body.indexOf("\n## "));
      expect(guide.body.slice(firstMention).startsWith(duoDefinition)).toBe(true);
      expect(html).toContain(duoDefinition.replace("'", "&#x27;"));
      expect(guide.body).not.toMatch(/\$|£|\b(?:USD|GBP|coupon|discount|remise|réduction)\b/i);
      for (const size of ["1398 × 2034", "2007 × 2853", "1206 × 2622", "1320 × 2868"]) expect(html).toContain(size);
      for (const label of locale === "fr" ? ["écran externe : 1398 × 2034", "écran interne : 2007 × 2853"] : ["outer display: 1398 × 2034", "inner display: 2007 × 2853"]) expect(html).toContain(label);
      expect(html).not.toMatch(/(?:5[,.]4|7[,.]6)[″"]/);
      expect(html).toContain(locale === "fr" ? "Pass, Indie et Studio" : "Pass, Indie and Studio");
      expect(html).toContain(locale === "fr" ? "2 ZIP HD" : "2 HD ZIPs");
      for (const price of locale === "fr" ? ["19 €", "12 €/mois, ou 120 €/an payés en une fois", "49 €/mois, ou 490 €/an payés en une fois"] : ["€19", "€12/month, or €120/year paid upfront", "€49/month, or €490/year paid upfront"]) expect(html).toContain(price);
      expect(html).toContain(locale === "fr" ? "TVA non applicable (art. 293 B du CGI)" : "VAT not applicable, art. 293 B of the French CGI");
      expect(html).toContain(locale === "fr" ? "n’a pas été testé par DuoShot" : "has not tested iPhone Duo uploads");
      for (const path of ["/specs", "/pricing", "/tool", ...COMPARISONS.filter((entry) => entry.slug !== slug).map((entry) => comparisonPath(entry.slug))]) {
        expect(html).toContain(`href="${localizedPath(locale, path)}"`);
      }
      const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
      expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["TechArticle"]);
      expect(graph[0]).toMatchObject({ headline: guide.title, description: guide.description, inLanguage: locale, dateModified: "2026-10-16", url: absoluteUrl(localizedPath(locale, comparisonPath(slug))), author: { "@id": `${absoluteUrl("/")}#organization` } });
    });
  }

  it("renders the supplied App Asset Kit facts with its default App Store sizes", async () => {
    const html = renderToStaticMarkup(await ComparisonPage({ params: Promise.resolve({ locale, slug: "duoshot-vs-app-asset-kit" }) }));
    const facts = locale === "fr" ? [
      "générateur gratuit de captures App Store et Google Play dans le navigateur",
      "génère aussi des icônes d’app",
      "traitées localement dans le navigateur, sans être envoyées au serveur",
      "aucune inscription", "aucun filigrane",
      "importez un à cinq écrans, choisissez un modèle et exportez un ZIP organisé de PNG",
      "dimensions App Store par défaut sont 1320 × 2868 (6,9″).",
    ] : [
      "free browser-based App Store and Google Play screenshot maker",
      "also generates app icons",
      "processed locally in the browser and are not uploaded",
      "no signup", "no watermark",
      "upload one to five screens, pick a template and export an organized ZIP of PNGs",
      "The default App Store size is 1320 × 2868 (6.9″).",
    ];
    for (const fact of facts) expect(html).toContain(fact);
    expect(html).not.toContain("2064 × 2752");
  });
});

it("generates all four comparison slugs, keeping Screenhance", () => {
  expect(generateStaticParams()).toEqual([
    { slug: "duoshot-vs-applaunchflow" },
    { slug: "duoshot-vs-appscreens" },
    { slug: "duoshot-vs-screenhance" },
    { slug: "duoshot-vs-app-asset-kit" },
  ]);
  expect(new Set(COMPARISONS.map(({ slug }) => slug)).size).toBe(4);
});

it("returns 404 for unknown comparisons and unsupported languages", async () => {
  expect(competitorComparison("en", "unknown")).toBeNull();
  for (const params of [{ locale: "en", slug: "unknown" }, { locale: "de", slug: COMPARISONS[0].slug }]) {
    await expect(generateMetadata({ params: Promise.resolve(params) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(ComparisonPage({ params: Promise.resolve(params) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  }
});
