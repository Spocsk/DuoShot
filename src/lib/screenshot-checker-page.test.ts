import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Page, { generateMetadata } from "@/app/[locale]/tools/iphone-duo-screenshot-checker/page";
import sitemap from "@/app/sitemap";
import { SpecsPage } from "@/components/specs-page";
import { comparisonGuide } from "./guides";
import { shouldSkipLocaleRewrite } from "./locale";
import { SCREENSHOT_CHECKER_PATH } from "./screenshot-checker";
import { screenshotCheckerCopy } from "./screenshot-checker-copy";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s screenshot checker page", (locale) => {
  it("is indexable with matching canonical, alternates and sitemap", async () => {
    const copy = screenshotCheckerCopy(locale);
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    const url = absoluteUrl(localizedPath(locale, SCREENSHOT_CHECKER_PATH));
    expect(metadata.title).toBe(copy.title);
    expect(`${metadata.title} · DuoShot`.length).toBeLessThanOrEqual(60);
    expect(metadata.description).toBe(copy.description);
    expect(copy.description.length).toBeLessThanOrEqual(155);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates).toEqual({ canonical: url, languages: {
      fr: absoluteUrl(SCREENSHOT_CHECKER_PATH), en: absoluteUrl(`/en${SCREENSHOT_CHECKER_PATH}`), "x-default": absoluteUrl(SCREENSHOT_CHECKER_PATH),
    } });
    expect(metadata.openGraph).toMatchObject({ url, description: copy.description });
    expect(metadata.twitter).toMatchObject({ description: copy.description });
    expect(sitemap().find((entry) => entry.url === url)?.alternates?.languages).toEqual(metadata.alternates?.languages);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, SCREENSHOT_CHECKER_PATH))).toBe(true);
  });

  it("renders localized content and schemas for the free checker", async () => {
    const copy = screenshotCheckerCopy(locale);
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale }) }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(copy.privacy);
    expect(html).toContain(copy.scope);
    expect(copy.labels.duoRule).toContain(locale === "fr" ? "10 captures par taille d’appareil" : "10 screenshots per device size");
    expect(copy.labels.duoRule).not.toMatch(/scaled|redimension/i);
    expect(copy.labels.duoRule).toContain("1398 × 2034");
    expect(copy.labels.duoRule).toContain("2007 × 2853");
    expect(copy.faq[1].a).toBe(copy.labels.duoRule);
    expect(copy.labels.appleOnly).toBe(locale === "fr" ? "Taille valide pour Apple, non produite par DuoShot :" : "Valid Apple size, not produced by DuoShot:");
    expect(html).not.toMatch(/single.*slot|seul emplacement|5[.,]4\s*(?:″|&quot;)|7[.,]6\s*(?:″|&quot;)/);
    expect(html).toContain(locale === "fr" ? "iPhone 6,3″" : "iPhone 6.3&quot;");
    expect(html).toContain(locale === "fr" ? "iPhone 6,9″" : "iPhone 6.9&quot;");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('type="file"');
    expect(html).toContain(`href="${localizedPath(locale, "/tool")}"`);
    for (const [width, height] of [[1398, 2034], [2007, 2853], [1320, 2868], [1206, 2622], [1179, 2556], [1290, 2796], [1260, 2736]]) {
      expect(html).toContain(`${width} × ${height}`);
      expect(html).toContain(`${height} × ${width}`);
    }
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["SoftwareApplication", "FAQPage"]);
    expect(graph[0]).toMatchObject({ name: copy.title, description: copy.description, url: absoluteUrl(localizedPath(locale, SCREENSHOT_CHECKER_PATH)), offers: [{ price: "0", priceCurrency: "EUR" }] });
    expect(graph[0].offers).toHaveLength(1);
    expect(graph[1].mainEntity).toEqual(copy.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })));
    expect(html.match(/class="t-acc /g)).toHaveLength(copy.faq.length);
  });

  it("is linked from specs and the existing guide in the same language", () => {
    const path = localizedPath(locale, SCREENSHOT_CHECKER_PATH);
    expect(renderToStaticMarkup(createElement(SpecsPage, { locale }))).toContain(`href="${path}"`);
    expect(comparisonGuide(locale).body).toContain(`](${path})`);
  });
});
