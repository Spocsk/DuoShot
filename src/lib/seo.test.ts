import { afterEach, describe, expect, it, vi } from "vitest";
import { SPECS_FAQ } from "./screenshot-copy";
import { pricingFaq } from "./pricing-faq";
import { getTranslator } from "./i18n";
import { FAQ } from "./i18n";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { localizedPath, MARKETING_ROUTE_PAIRS } from "./site";
import { pageMetadata } from "./seo";
import { JsonLd, SiteJsonLd, jsonLdGraph, siteJsonLdGraph } from "./json-ld";
import { SCREENSHOT_VERIFIED_ON, SPECS_PAGE_COPY, sizePageCopy } from "./screenshot-pages";
import { generateMetadata as specsMetadata } from "@/app/[locale]/specs/page";
import { generateMetadata as outerMetadata } from "@/app/[locale]/1398x2034/page";
import { generateMetadata as innerMetadata } from "@/app/[locale]/2007x2853/page";
import { generateMetadata as iphone63Metadata } from "@/app/[locale]/1206x2622/page";
import { generateImageMetadata as iphone63ImageMetadata, generateStaticParams as iphone63ImageParams } from "@/app/[locale]/1206x2622/opengraph-image";
import { generateMetadata as iphone69Metadata } from "@/app/[locale]/1320x2868/page";
import { generateMetadata as homeMetadata } from "@/app/[locale]/page";
import { generateMetadata as pricingMetadata } from "@/app/[locale]/pricing/page";
import { generateMetadata as toolMetadata } from "@/app/[locale]/tool/page";
import { generateMetadata as whyFrMetadata } from "@/app/[locale]/pourquoi-pas-ia/page";
import { generateMetadata as whyEnMetadata } from "@/app/[locale]/why-not-ai/page";
import { generateMetadata as rejectionFrMetadata } from "@/app/[locale]/rejet/page";
import { generateMetadata as rejectionEnMetadata } from "@/app/[locale]/rejection/page";
import { HOME_PAGE_COPY } from "./marketing-copy";
import { generateImageMetadata as iphone69ImageMetadata, generateStaticParams as iphone69ImageParams } from "@/app/[locale]/1320x2868/opengraph-image";

afterEach(() => vi.unstubAllEnvs());

describe("public routes and crawler metadata", () => {
  it("maps final localized routes reciprocally", () => {
    for (const route of MARKETING_ROUTE_PAIRS) {
      expect(localizedPath("en", route.fr)).toBe(route.en);
      expect(localizedPath("fr", route.en)).toBe(route.fr);
    }
    expect(localizedPath("en", "/en/rejet")).toBe("/en/rejection");
  });

  it("puts noindex on each private route in both languages", () => {
    for (const path of ["/tool", "/account", "/login", "/signup", "/invite/token", "/r/id"]) {
      for (const locale of ["fr", "en"] as const) {
        expect(pageMetadata({ locale, path, title: "test", description: "test" }).robots).toEqual({ index: false, follow: false });
      }
    }
  });

  it("lets crawlers read private page noindex and uses one bot policy", () => {
    expect(robots().rules).toEqual([{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }]);
  });

  it.each(["https://duoshot.site", "https://duoshot.site/"])("aligns both home canonicals and sitemap URLs exactly with base %s", (base) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", base);
    for (const locale of ["fr", "en"] as const) {
      const metadata = pageMetadata({ locale, path: "/", title: "iPhone Duo screenshots", description: "DuoShot" });
      const url = `https://duoshot.site${locale === "fr" ? "" : "/en"}`;
      expect(metadata.title).toEqual({ absolute: expect.stringMatching(/^DuoShot — /) });
      expect(metadata.alternates?.canonical).toBe(url);
      const entry = sitemap().find((item) => item.url === url);
      expect(entry).toBeDefined();
      expect(entry?.alternates?.languages).toEqual(metadata.alternates?.languages);
    }
  });

  it("gives every sitemap entry its canonical and reciprocal alternates", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site/");
    const entries = sitemap();
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    for (const route of MARKETING_ROUTE_PAIRS) {
      for (const locale of ["fr", "en"] as const) {
        const metadata = pageMetadata({ locale, path: route.fr, title: "test", description: "test" });
        const entry = entries.find((item) => item.url === metadata.alternates?.canonical);
        expect(entry?.priority).toBe(route.priority);
        expect(entry?.alternates?.languages).toEqual(metadata.alternates?.languages);
      }
    }
  });

  for (const locale of ["fr", "en"] as const) {
    it(`gives specs the general size and fold intent in ${locale}`, async () => {
      const metadata = await specsMetadata({ params: Promise.resolve({ locale }) });
      const title = `${metadata.title} · DuoShot`;
      expect(title).toContain(locale === "fr" ? "Tailles des captures iPhone Duo" : "iPhone Duo screenshot size");
      expect(title).toContain(locale === "fr" ? "pli" : "fold");
      expect(title).not.toMatch(/1398|2007|1206|1320/);
      expect(title.length).toBeLessThanOrEqual(60);
      expect(metadata.openGraph?.title).toBe(title);
      expect(metadata.twitter?.title).toBe(title);
    });

    it(`keeps all edited search and social metadata concise, synchronized and distinct in ${locale}`, async () => {
      const titles = new Set();
      const descriptions = new Set();
      for (const generateMetadata of [
        homeMetadata, specsMetadata, pricingMetadata, toolMetadata,
        outerMetadata, innerMetadata, iphone63Metadata, iphone69Metadata,
        locale === "fr" ? whyFrMetadata : whyEnMetadata,
        locale === "fr" ? rejectionFrMetadata : rejectionEnMetadata,
      ]) {
        const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
        // Include the document layout's brand suffix when measuring <title>.
        const title = typeof metadata.title === "string" ? `${metadata.title} · DuoShot` : (metadata.title as { absolute: string }).absolute;
        expect(title.length, title).toBeLessThanOrEqual(60);
        expect(metadata.description?.length, title).toBeLessThanOrEqual(155);
        expect(metadata.openGraph).toMatchObject({ title, description: metadata.description });
        expect(metadata.twitter).toMatchObject({ title, description: metadata.description });
        titles.add(title);
        descriptions.add(metadata.description);
      }
      expect(titles.size).toBe(10);
      expect(descriptions.size).toBe(10);
    });

    it(`gives specs and all size pages distinct metadata and sitemap entries in ${locale}`, async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
      const pages = [
        ["specs", specsMetadata], ["1398x2034", outerMetadata], ["2007x2853", innerMetadata],
        ["1206x2622", iphone63Metadata],
        ["1320x2868", iphone69Metadata],
      ] as const;
      const titles = new Set();
      const descriptions = new Set();
      for (const [slug, generateMetadata] of pages) {
        const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
        const url = `https://duoshot.site${locale === "en" ? "/en" : ""}/${slug}`;
        expect(metadata.alternates).toEqual({ canonical: url, languages: {
          fr: `https://duoshot.site/${slug}`, en: `https://duoshot.site/en/${slug}`, "x-default": `https://duoshot.site/${slug}`,
        } });
        expect(metadata.robots).toBeUndefined();
        expect(metadata.openGraph).toMatchObject({ url, description: metadata.description });
        expect(sitemap().find((entry) => entry.url === url)?.alternates?.languages).toEqual(metadata.alternates?.languages);
        titles.add(metadata.title);
        descriptions.add(metadata.description);
      }
      expect(titles.size).toBe(pages.length);
      expect(descriptions.size).toBe(pages.length);
    });
  }

  it("publishes the new size page's localized Open Graph image metadata", () => {
    expect(iphone63ImageParams()).toEqual([{ locale: "fr" }, { locale: "en" }]);
    for (const locale of ["fr", "en"] as const) {
      expect(iphone63ImageMetadata({ params: { locale } })).toEqual([{
        id: "card", alt: expect.stringContaining(locale === "fr" ? "6,3" : "6.3"),
        size: { width: 1200, height: 630 }, contentType: "image/png",
      }]);
    }
  });

  it("publishes the optional 6.9-inch page's localized Open Graph image metadata", () => {
    expect(iphone69ImageParams()).toEqual([{ locale: "fr" }, { locale: "en" }]);
    for (const locale of ["fr", "en"] as const) {
      expect(iphone69ImageMetadata({ params: { locale } })).toEqual([{
        id: "card", alt: expect.stringContaining(locale === "fr" ? "6,9" : "6.9"),
        size: { width: 1200, height: 630 }, contentType: "image/png",
      }]);
      expect(iphone69ImageMetadata({ params: { locale } })[0].alt).toContain("1320 × 2868");
    }
  });
});

describe("page-specific structured data", () => {
  it("emits FAQPage only when explicit, nonempty questions are supplied", () => {
    for (const faq of [undefined, []]) {
      expect(jsonLdGraph("en", { path: "/1398x2034", faq })["@graph"].some((node) => node["@type"] === "FAQPage")).toBe(false);
    }
    for (const locale of ["fr", "en"] as const) {
      for (const [path, faq] of [["/", FAQ[locale]], ["/pricing", [...pricingFaq(getTranslator(locale)), ...FAQ[locale]]], ["/specs", SPECS_FAQ[locale]]] as const) {
        const node = jsonLdGraph(locale, { path, faq })["@graph"].find((item) => "mainEntity" in item);
        expect(node?.mainEntity).toEqual(faq.map(({ q, a }) => ({
          "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a },
        })));
      }
    }
  });

  it("describes the localized specs and size articles without unrelated offers or FAQs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    for (const locale of ["fr", "en"] as const) {
      for (const [path, copy] of [
        ["/specs", SPECS_PAGE_COPY[locale]],
        ["/1398x2034", sizePageCopy(locale, "1398x2034")],
        ["/2007x2853", sizePageCopy(locale, "2007x2853")],
        ["/1206x2622", sizePageCopy(locale, "1206x2622")],
        ["/1320x2868", sizePageCopy(locale, "1320x2868")],
      ] as const) {
        const graph = jsonLdGraph(locale, { path, article: { ...copy, dateModified: SCREENSHOT_VERIFIED_ON } })["@graph"];
        const url = `https://duoshot.site${localizedPath(locale, path)}`;
        expect(graph.map((node) => node["@type"])).toEqual(["TechArticle"]);
        expect(graph[0]).toMatchObject({ headline: copy.title, description: copy.description, url, mainEntityOfPage: url, inLanguage: locale, dateModified: "2026-10-13" });
      }
    }
  });

  it.each(["fr", "en"] as const)("keeps the required free size and optional paid size in %s structured data", (locale) => {
    const size63 = locale === "fr" ? "6,3″" : "6.3″";
    const size69 = locale === "fr" ? "6,9″" : "6.9″";
    const graph = siteJsonLdGraph(locale)["@graph"];
    const app = graph.find((node) => "offers" in node)!;
    expect(app.description).toContain(size63);
    expect(app.description).toContain(size69);
    expect(app.description).toContain(locale === "fr" ? "optionnel" : "optional");
    expect(app.offers?.[0]).toMatchObject({ price: "0", description: expect.stringContaining(size63) });
    const sizesAnswer = FAQ[locale].find(({ a }) => a.includes("1206×2622"))!.a;
    expect(sizesAnswer).toContain(locale === "fr" ? "incluse dans l’essai gratuit" : "included in the free trial");
    expect(sizesAnswer).toContain("1179×2556");
    const article = sizePageCopy(locale, "1206x2622");
    expect(article.description).toContain("1179x2556");
    expect(article.intro).toContain(locale === "fr" ? "essai gratuit" : "free trial");
    const optionalArticle = sizePageCopy(locale, "1320x2868");
    expect(optionalArticle.description).toContain(locale === "fr" ? "optionnelles" : "Optional");
    expect(optionalArticle.description).toContain("1320x2868");
    expect(optionalArticle.description).toContain("2868x1320");
    expect(optionalArticle.description).toContain("Indie");
    expect(optionalArticle.description).toContain("Studio");
    expect(optionalArticle.portrait).toMatchObject({ slot: "iphone-69", width: 1320, height: 2868, gated: "indie-studio" });
    expect(optionalArticle.landscape).toMatchObject({ slot: "iphone-69", width: 2868, height: 1320, gated: "indie-studio" });
    expect(SPECS_PAGE_COPY[locale].description).toContain(locale === "fr" ? "6,9″ optionnel" : "6.9″ is optional");
  });

  it.each(["fr", "en"] as const)("identifies the shared organization and software in %s without duplicating them on pages", (locale) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    const graph = siteJsonLdGraph(locale)["@graph"];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "SoftwareApplication"]);
    expect(graph[0]).toMatchObject({ "@id": "https://duoshot.site#organization", url: "https://duoshot.site" });
    expect(graph[1]).toMatchObject({
      "@id": "https://duoshot.site#software",
      name: "DuoShot — iPhone Duo App Store Screenshots",
      url: `https://duoshot.site${locale === "en" ? "/en" : ""}`,
      publisher: { "@id": graph[0]["@id"] },
      applicationCategory: "DeveloperApplication", operatingSystem: "Web",
      description: HOME_PAGE_COPY[locale].description,
    });
    const script = SiteJsonLd({ locale });
    expect(JSON.parse(script.props.dangerouslySetInnerHTML.__html)).toEqual(siteJsonLdGraph(locale));
    for (const path of ["/", "/pricing", "/specs"]) {
      const page = jsonLdGraph(locale, { path, faq: FAQ[locale] });
      expect(page["@graph"].some((node) => ["Organization", "SoftwareApplication"].includes(node["@type"]))).toBe(false);
    }
  });

  it.each(["fr", "en"] as const)("uses the published EUR prices and billing periods in %s", (locale) => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    const app = siteJsonLdGraph(locale)["@graph"].find((node) => "offers" in node)!;
    expect(app.offers?.map((offer) => [offer.price, offer.priceCurrency])).toEqual([
      ["0", "EUR"], ["12", "EUR"], ["49", "EUR"], ["120", "EUR"], ["490", "EUR"], ["19", "EUR"],
    ]);
    expect(app.offers?.slice(1).map((offer) => "priceSpecification" in offer ? offer.priceSpecification : undefined)).toEqual([
      ["12", "P1M"], ["49", "P1M"], ["120", "P1Y"], ["490", "P1Y"], ["19", "P30D"],
    ].map(([price, billingDuration]) => ({ "@type": "UnitPriceSpecification", price, priceCurrency: "EUR", billingDuration })));
    expect(app.offers?.[0].name).toContain("2 exports");
  });

  it.each([undefined, "", "   ", "price_pass30"])("includes the 19 EUR 30-day pass only with a nonempty price ID (%s)", (priceId) => {
    vi.stubEnv("STRIPE_PRICE_PASS30", priceId);
    for (const locale of ["fr", "en"] as const) {
      const app = siteJsonLdGraph(locale)["@graph"].find((node) => "offers" in node);
      expect(app?.offers?.map((offer) => offer.price)).toEqual(priceId?.trim() ? ["0", "12", "49", "120", "490", "19"] : ["0", "12", "49", "120", "490"]);
      if (priceId?.trim()) {
        expect(app?.offers?.at(-1)).toMatchObject({ "@type": "Offer", price: "19", priceCurrency: "EUR", priceSpecification: { billingDuration: "P30D" } });
      }
    }
  });

  it.each(["", "price_pass30"])("keeps pricing metadata and shared offers aligned with Pass availability (%s)", async (priceId) => {
    vi.stubEnv("STRIPE_PRICE_PASS30", priceId);
    for (const locale of ["fr", "en"] as const) {
      const metadata = await pricingMetadata({ params: Promise.resolve({ locale }) });
      expect(metadata.description?.includes("Pass")).toBe(Boolean(priceId));
      expect(metadata.description!.length).toBeLessThanOrEqual(155);
      expect(metadata.description).toContain(locale === "fr" ? "6,9″" : "6.9″");
      const app = siteJsonLdGraph(locale)["@graph"].find((node) => "offers" in node);
      expect(app?.offers?.some((offer) => offer.price === "19")).toBe(Boolean(priceId));
    }
  });

  it("escapes HTML in structured data while preserving the JSON content", () => {
    const script = JsonLd({ locale: "en", path: "/", faq: [{ q: "</script><script>alert(1)</script>", a: "Safe text" }] });
    const serialized = script.props.dangerouslySetInnerHTML.__html;
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)["@graph"].at(-1).mainEntity[0].name).toBe("</script><script>alert(1)</script>");
  });
});
