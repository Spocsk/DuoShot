import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ComparisonPage, { generateMetadata, generateStaticParams } from "@/app/[locale]/guides/[slug]/page";
import sitemap from "@/app/sitemap";
import { COMPARISONS, competitorComparison, comparisonPath } from "./comparisons";
import { comparisonGuide } from "./guides";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath, rejectionPath } from "./site";

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
      // DuoShot stays EUR-only with no discounts; the AppScreens page may quote their USD plan prices.
      expect(guide.body).not.toMatch(slug === "duoshot-vs-appscreens"
        ? /£|\b(?:USD|GBP|coupon|discount|remise|réduction)\b/i
        : /\$|£|\b(?:USD|GBP|coupon|discount|remise|réduction)\b/i);
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
      // Only the enriched AppScreens page emits a FAQPage alongside the TechArticle.
      expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(slug === "duoshot-vs-appscreens" ? ["TechArticle", "FAQPage"] : ["TechArticle"]);
      expect(graph[0]).toMatchObject({ headline: guide.title, description: guide.description, inLanguage: locale, dateModified: COMPARISONS.find((entry) => entry.slug === slug)!.checked, url: absoluteUrl(localizedPath(locale, comparisonPath(slug))), author: { "@type": "Person", name: "Dylan Couto de Oliveira" }, publisher: { "@id": `${absoluteUrl("/")}#organization` } });
      // Generated comparison pages have no published date in data, so datePublished is omitted.
      expect(graph[0]).not.toHaveProperty("datePublished");
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

  it("presents AppScreen (appscreen.pro) as distinct from AppScreens", async () => {
    const html = renderToStaticMarkup(await ComparisonPage({ params: Promise.resolve({ locale, slug: "duoshot-vs-appscreen-pro" }) }));
    const facts = locale === "fr" ? [
      "AppScreen (appscreen.pro, édité par Intenseloop, Inc.)",
      "éditeur de captures panoramiques pour l’App Store et Google Play",
      "AppScreen est un produit différent d’AppScreens (appscreens.com).",
    ] : [
      "AppScreen (appscreen.pro, by Intenseloop, Inc.)",
      "panorama screenshot editor for the App Store and Google Play",
      "AppScreen is a different product from AppScreens (appscreens.com).",
    ];
    for (const fact of facts) expect(html).toContain(fact);
    expect(html).toContain('href="https://appscreen.pro/"');
  });

  it("presents Store Connect Studio with direct App Store Connect sync and DuoShot's missing upload", async () => {
    const html = renderToStaticMarkup(await ComparisonPage({ params: Promise.resolve({ locale, slug: "duoshot-vs-store-connect-studio" }) }));
    const facts = locale === "fr" ? [
      "Store Connect Studio, édité par Anax,",
      "synchronise l’ensemble avec App Store Connect via votre propre clé API conservée dans le trousseau macOS",
      "DuoShot ne dépose pas encore vers App Store Connect et s’arrête à un ZIP que vous déposez vous-même.",
    ] : [
      "Store Connect Studio, by Anax,",
      "syncs everything to App Store Connect with your own API key kept in the macOS Keychain",
      "DuoShot does not yet upload to App Store Connect and stops at a ZIP you upload yourself.",
    ];
    for (const fact of facts) expect(html).toContain(fact);
    expect(html).toContain('href="https://anaxkg.com/en/store-connect-studio"');
  });

  it("enriches AppScreens with the 2026-11-13 date, a sourced table, required links and a FAQ that matches its JSON-LD, without superlatives", async () => {
    const slug = "duoshot-vs-appscreens";
    const guide = competitorComparison(locale, slug)!;
    const html = renderToStaticMarkup(await ComparisonPage({ params: Promise.resolve({ locale, slug }) }));

    // Verification date bumped to 2026-11-13 and shown on the page.
    expect(COMPARISONS.find((entry) => entry.slug === slug)!.checked).toBe("2026-11-13");
    expect(html).toContain(locale === "fr" ? "13 novembre 2026" : "November 13, 2026");

    // Sourced comparison rows and the required Apple slot, from the AppScreens site reviewed 2026-11-13.
    const facts = locale === "fr" ? [
      "Point de départ",
      "Leur menu cite iPhone Duo ; leur tableau de tarifs le réserve aux abonnements",
      "Envoi direct vers les stores, indiqué pour les offres payantes",
      "App Store et Google Play, plus d’autres préréglages",
      "Free, Pro 99 $/an, Scale 180 $/an",
      "iPhone with Dynamic Island (medium display)",
    ] : [
      "Starting point",
      "Their menu lists iPhone Duo; their pricing table marks it as subscription-only",
      "Direct upload to the stores, stated for paid plans",
      "App Store and Google Play, plus other presets",
      "Free, Pro $99/year, Scale $180/year",
      "iPhone with Dynamic Island (medium display)",
    ];
    for (const fact of facts) expect(html).toContain(fact);
    expect(html).toContain('href="https://appscreens.com/pricing"');

    // Every reference link the brief requires, localized and present.
    for (const path of ["/1206x2622", "/1398x2034", "/2007x2853", "/guides/app-store-screenshot-sizes", "/guides/screenshot-size/iphone-duo", "/tools/iphone-duo-screenshot-checker"]) {
      expect(html).toContain(`href="${localizedPath(locale, path)}"`);
    }
    expect(html).toContain(`href="${rejectionPath(locale)}"`);

    // FAQPage JSON-LD is identical to the visible FAQ text.
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    const faqNode = graph.find((node: { "@type": string }) => node["@type"] === "FAQPage");
    expect(guide.faq!.length).toBeGreaterThanOrEqual(3);
    expect(faqNode.mainEntity).toHaveLength(guide.faq!.length);
    const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    faqNode.mainEntity.forEach((entry: { name: string; acceptedAnswer: { text: string } }, index: number) => {
      expect(entry.name).toBe(guide.faq![index].q);
      expect(entry.acceptedAnswer.text).toBe(guide.faq![index].a);
      expect(html).toContain(escape(guide.faq![index].q));
      expect(html).toContain(escape(guide.faq![index].a));
    });

    // No superlatives or "better than" framing (link URLs stripped so the guide slug does not count).
    const prose = guide.body.replace(/\]\([^)]*\)/g, "]");
    expect(prose).not.toMatch(/\b(?:best|better|meilleur|meilleure|supérieur|supérieure)\b/i);
  });
});

it("generates every comparison slug, keeping Screenhance", () => {
  expect(generateStaticParams()).toEqual([
    { slug: "duoshot-vs-applaunchflow" },
    { slug: "duoshot-vs-appscreens" },
    { slug: "duoshot-vs-screenhance" },
    { slug: "duoshot-vs-app-asset-kit" },
    { slug: "duoshot-vs-screenies" },
    { slug: "duoshot-vs-appshot-maker" },
    { slug: "duoshot-vs-applaunchpad" },
    { slug: "duoshot-vs-screenshots-pro" },
    { slug: "duoshot-vs-appmockup" },
    { slug: "duoshot-vs-duo-studio" },
    { slug: "duoshot-vs-appscreen-pro" },
    { slug: "duoshot-vs-store-connect-studio" },
  ]);
  expect(new Set(COMPARISONS.map(({ slug }) => slug)).size).toBe(COMPARISONS.length);
});

it("returns 404 for unknown comparisons and unsupported languages", async () => {
  expect(competitorComparison("en", "unknown")).toBeNull();
  for (const params of [{ locale: "en", slug: "unknown" }, { locale: "de", slug: COMPARISONS[0].slug }]) {
    await expect(generateMetadata({ params: Promise.resolve(params) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(ComparisonPage({ params: Promise.resolve(params) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  }
});
