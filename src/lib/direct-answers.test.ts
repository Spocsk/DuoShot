import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import OuterPage from "@/app/[locale]/1398x2034/page";
import InnerPage from "@/app/[locale]/2007x2853/page";
import SpecsPage from "@/app/[locale]/specs/page";
import RejectionFrPage from "@/app/[locale]/rejet/page";
import RejectionEnPage from "@/app/[locale]/rejection/page";
import { I18nProvider } from "@/components/i18n-provider";
import { PricingPage } from "@/components/pricing-page";
import { SizePage } from "@/components/size-page";
import { APPLE_SCREENSHOT_SOURCE } from "./apple-screenshot-status";
import { directAnswer } from "./direct-answers";
import { getMessages, getTranslator } from "./i18n";
import { SiteJsonLd, jsonLdGraph, siteJsonLdGraph } from "./json-ld";
import { REJECTION_PAGE_COPY } from "./marketing-copy";
import { CHECKOUT_CATALOG, FREE_EXPORTS, PASS30 } from "./plans";
import { SCREENSHOT_VERIFIED_ON, sizePageCopy } from "./screenshot-pages";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/billing-availability", () => ({
  checkoutDisplayAvailable: () => true,
  passCheckoutAvailable: () => true,
}));

afterEach(() => vi.unstubAllEnvs());

function unescapeHtml(text: string) {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number(entity.slice(1)));
    return entities[entity];
  });
}

function visibleText(html: string) {
  return unescapeHtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]*>/g, " "));
}

type SchemaNode = {
  "@type": string;
  abstract?: string;
  mainEntity?: { acceptedAnswer: { text: string } }[];
  offers?: { price: string }[];
};

function schemaNodes(html: string): SchemaNode[] {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  expect(scripts.length).toBeGreaterThan(0);
  return scripts.flatMap(([, json]) => JSON.parse(json)["@graph"]);
}

describe.each(["fr", "en"] as const)("%s direct answers", (locale) => {
  const pages = {
    "1398x2034": OuterPage,
    "2007x2853": InnerPage,
    specs: SpecsPage,
    rejection: locale === "fr" ? RejectionFrPage : RejectionEnPage,
  };

  it.each(Object.keys(pages) as (keyof typeof pages)[])("renders %s immediately after H1 and reuses its text in TechArticle", async (page) => {
    const html = renderToStaticMarkup(await pages[page]({ params: Promise.resolve({ locale }) }));
    const paragraph = html.match(/<\/h1>\s*(<p\b[^>]*>[\s\S]*?<\/p>)/)?.[1];
    expect(paragraph).toBeDefined();
    expect(paragraph).toMatch(/^<p data-testid="direct-answer" class="mt-4 text-lg">/);
    const text = unescapeHtml(paragraph!.match(/<span data-testid="direct-answer-text">([^<]*)<\/span>/)![1]);
    const answer = directAnswer(locale, page);
    expect(text).toBe(answer.text);
    expect(text.match(/[.!?]/g)).toEqual(["."]);
    expect(text).toMatch(/\.$/);
    expect(text).not.toContain(". ");
    expect(paragraph!.match(/<a href="([^"]+)" class="ds-link">/)?.[1]).toBe(APPLE_SCREENSHOT_SOURCE);
    expect(answer.sourceUrl).toBe(APPLE_SCREENSHOT_SOURCE);
    expect(unescapeHtml(paragraph!.match(/<a[^>]*>([^<]*)<\/a>/)![1])).toBe(locale === "fr"
      ? "Source : spécifications des captures d’écran d’Apple"
      : "Source: Apple screenshot specifications");

    const nodes = schemaNodes(html);
    const articles = nodes.filter((node) => node["@type"] === "TechArticle");
    expect(articles).toHaveLength(1);
    expect(articles[0].abstract).toBe(text);
    if (page === "rejection") {
      expect(articles[0]).toMatchObject({
        headline: getTranslator(locale).t("reject_app_store_screenshot_errors"),
        description: REJECTION_PAGE_COPY[locale].description,
        dateModified: SCREENSHOT_VERIFIED_ON,
      });
    }
    const faqs = nodes.filter((node) => node["@type"] === "FAQPage");
    expect(faqs).toHaveLength(page === "specs" || page === "rejection" ? 1 : 0);
    const visible = visibleText(html);
    for (const faq of faqs) {
      expect(faq.mainEntity!.length).toBeGreaterThan(0);
      for (const question of faq.mainEntity!) expect(visible).toContain(question.acceptedAnswer.text);
    }
    const oldApplePath = ["app-store-connect", "reference", "screenshot-specifications"].join("/");
    for (const removed of ["1878", "clear of the fold", "APP_IPHONE_DUO", "emplacement unique", "single slot", "5,4″", "7,6″", '5.4"', '7.6"', oldApplePath]) {
      expect(unescapeHtml(html)).not.toContain(removed);
    }
  });

  it.each(["1206x2622", "1320x2868"] as const)("keeps %s without a direct answer or an abstract", (size) => {
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
    expect(html).not.toContain('data-testid="direct-answer"');
    expect(schemaNodes(html)).toEqual(jsonLdGraph(locale, {
      path: `/${size}`, article: { ...sizePageCopy(locale, size), dateModified: SCREENSHOT_VERIFIED_ON },
    })["@graph"]);
    expect(schemaNodes(html)[0]).not.toHaveProperty("abstract");
  });

  it("matches structured offer prices to the plan source and visible pricing copy", async () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    const offers = siteJsonLdGraph(locale)["@graph"].find((node) => "offers" in node)!.offers!;
    expect(offers.map((offer) => offer.price)).toEqual([
      "0", ...Object.values(CHECKOUT_CATALOG).map((offer) => String(offer.amountCents / 100)), String(PASS30.priceEur),
    ]);
    expect(offers.at(-1)).toMatchObject({
      price: String(PASS30.priceEur), priceSpecification: { billingDuration: `P${PASS30.days}D` },
    });
    const trialBody = getTranslator(locale).tf("pricing_trial_body", { exports: FREE_EXPORTS });
    expect(offers[0]).toMatchObject({ description: trialBody });

    const html = renderToStaticMarkup(createElement(I18nProvider,
      { locale, messages: getMessages(locale) } as ComponentProps<typeof I18nProvider>,
      createElement("div", null, createElement(SiteJsonLd, { locale }), await PricingPage({ locale })),
    ));
    expect(visibleText(html)).toContain(trialBody);
    const pass = html.match(/<article[^>]*data-testid="pricing-pass30"[^>]*>([\s\S]*?)<\/article>/)![1];
    const displayedPrice = unescapeHtml(pass.match(/<p class="studio-plan-price">([^<]*)<\/p>/)![1]);
    expect(displayedPrice).toBe(locale === "fr" ? `${PASS30.priceEur}\u00a0€` : `€${PASS30.priceEur}`);
    const structuredPass = schemaNodes(html).find((node) => node["@type"] === "SoftwareApplication")!.offers!.at(-1)!;
    expect(Number(displayedPrice.replace(/[^\d.]/g, ""))).toBe(Number(structuredPass.price));
  });
});
