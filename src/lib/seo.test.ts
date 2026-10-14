import { afterEach, describe, expect, it, vi } from "vitest";
import { SPECS_FAQ } from "./screenshot-copy";
import { pricingFaq } from "./pricing-faq";
import { getTranslator } from "./i18n";
import { FAQ } from "./i18n";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { localizedPath, MARKETING_ROUTE_PAIRS } from "./site";
import { pageMetadata } from "./seo";
import { JsonLd, jsonLdGraph } from "./json-ld";
import { SCREENSHOT_VERIFIED_ON, SPECS_PAGE_COPY, sizePageCopy } from "./screenshot-pages";
import { generateMetadata as specsMetadata } from "@/app/[locale]/specs/page";
import { generateMetadata as outerMetadata } from "@/app/[locale]/1398x2034/page";
import { generateMetadata as innerMetadata } from "@/app/[locale]/2007x2853/page";
import { generateMetadata as iphone63Metadata } from "@/app/[locale]/1206x2622/page";
import { generateImageMetadata as iphone63ImageMetadata, generateStaticParams as iphone63ImageParams } from "@/app/[locale]/1206x2622/opengraph-image";

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
    it(`keeps screenshot dimensions in concise specs search and social titles in ${locale}`, async () => {
      const metadata = await specsMetadata({ params: Promise.resolve({ locale }) });
      const title = `${metadata.title} · DuoShot`;
      for (const size of ["1398×2034", "2007×2853", "1206×2622"]) {
        expect(title).toContain(size);
      }
      expect(title.length).toBeLessThanOrEqual(65);
      expect(metadata.openGraph?.title).toBe(title);
      expect(metadata.twitter?.title).toBe(title);
    });

    it(`gives specs and all size pages distinct metadata and sitemap entries in ${locale}`, async () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
      const pages = [
        ["specs", specsMetadata], ["1398x2034", outerMetadata], ["2007x2853", innerMetadata],
        ["1206x2622", iphone63Metadata],
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
      expect(titles.size).toBe(4);
      expect(descriptions.size).toBe(4);
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
      ] as const) {
        const graph = jsonLdGraph(locale, { path, article: { ...copy, dateModified: SCREENSHOT_VERIFIED_ON } })["@graph"];
        const url = `https://duoshot.site${localizedPath(locale, path)}`;
        expect(graph.map((node) => node["@type"])).toEqual(["Organization", "TechArticle"]);
        expect(graph[1]).toMatchObject({ headline: copy.title, description: copy.description, url, mainEntityOfPage: url, inLanguage: locale, dateModified: "2026-10-13" });
      }
    }
  });

  it.each(["fr", "en"] as const)("keeps the required free size and optional paid size in %s structured data", (locale) => {
    const size63 = locale === "fr" ? "6,3″" : "6.3″";
    const size69 = locale === "fr" ? "6,9″" : "6.9″";
    for (const path of ["/", "/pricing"]) {
      const graph = jsonLdGraph(locale, { path, software: true, faq: FAQ[locale] })["@graph"];
      const app = graph.find((node) => "offers" in node)!;
      expect(app.description).toContain(size63);
      expect(app.description).toContain(size69);
      expect(app.description).toContain(locale === "fr" ? "optionnel" : "optional");
      expect(app.offers?.[0]).toMatchObject({ price: "0", description: expect.stringContaining(size63) });
      const sizesAnswer = FAQ[locale].find(({ a }) => a.includes("1206×2622"))!.a;
      expect(sizesAnswer).toContain(locale === "fr" ? "incluse dans l’essai gratuit" : "included in the free trial");
      expect(sizesAnswer).toContain("1179×2556");
    }
    const article = sizePageCopy(locale, "1206x2622");
    expect(article.description).toContain("1179x2556");
    expect(article.intro).toContain(locale === "fr" ? "essai gratuit" : "free trial");
    expect(SPECS_PAGE_COPY[locale].description).toContain(locale === "fr" ? "6,9″ optionnel" : "optional 6.9″");
  });

  it.each([undefined, "", "   ", "price_pass30"])("includes the 19 EUR 30-day pass only with a nonempty price ID (%s)", (priceId) => {
    vi.stubEnv("STRIPE_PRICE_PASS30", priceId);
    for (const locale of ["fr", "en"] as const) {
      for (const path of ["/", "/pricing"]) {
        const app = jsonLdGraph(locale, { path, software: true })["@graph"].find((node) => "offers" in node);
        expect(app?.offers?.map((offer) => offer.price)).toEqual(priceId?.trim() ? ["0", "12", "49", "120", "490", "19"] : ["0", "12", "49", "120", "490"]);
        if (priceId?.trim()) {
          expect(app?.offers?.at(-1)).toMatchObject({ "@type": "Offer", price: "19", priceCurrency: "EUR", priceSpecification: { billingDuration: "P30D" } });
        }
      }
    }
  });

  it("escapes HTML in structured data while preserving the JSON content", () => {
    const script = JsonLd({ locale: "en", path: "/", faq: [{ q: "</script><script>alert(1)</script>", a: "Safe text" }] });
    const serialized = script.props.dangerouslySetInnerHTML.__html;
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)["@graph"].at(-1).mainEntity[0].name).toBe("</script><script>alert(1)</script>");
  });
});
