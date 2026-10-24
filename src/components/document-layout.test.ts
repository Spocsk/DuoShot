import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTranslator } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { DocumentLayout } from "./document-layout";
import { SpecsPage } from "./specs-page";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  IBM_Plex_Mono: () => ({ variable: "font-mono" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/specs",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => vi.unstubAllEnvs());

describe.each(["fr", "en"] as const)("%s root document with specs", (locale) => {
  it("renders the distinction and one shared organization and application alongside the article and FAQ", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    const html = renderToStaticMarkup(createElement(DocumentLayout,
      { locale } as ComponentProps<typeof DocumentLayout>, createElement(SpecsPage, { locale }),
    ));
    const qualifiedDevice = locale === "fr" ? "iPhone Duo (le téléphone pliable d'Apple)" : "iPhone Duo (Apple's foldable iPhone)";
    expect(html.replace(/&#x27;/g, "'")).toContain(getTranslator(locale).t("specs_duoshot_identity"));
    expect(html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1].replace(/&#x27;/g, "'")).toContain(qualifiedDevice);
    expect(html).toContain("DuoScreenshot (duoscreenshot.com)");
    expect(html).toContain(locale === "fr" ? "DuoShot (duoshot.site) est distinct de DuoScreenshot (duoscreenshot.com)." : "DuoShot (duoshot.site) is not affiliated with DuoScreenshot (duoscreenshot.com).");
    expect(html.replace(/&quot;/g, '"')).toContain(locale === "fr"
      ? "iPhone Dynamic Island (écran moyen, 6,3″) requis"
      : 'iPhone with Dynamic Island (medium display, 6.3") required');
    expect(html).not.toMatch(/5[,.]4|7[,.]6/);
    const nodes = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
      .flatMap((match) => JSON.parse(match[1])["@graph"]);
    expect(nodes.map((node) => node["@type"])).toEqual(["Organization", "SoftwareApplication", "TechArticle", "FAQPage"]);
    expect(nodes[0].logo).toBe(absoluteUrl("/brand/duoshot-logo.png"));
    expect(nodes[0].sameAs).toEqual(["https://www.threads.com/@duoshot.app"]);
    for (const node of nodes.slice(0, 2)) expect(node.description).toContain(qualifiedDevice);
    expect(nodes[2].author["@id"]).toBe(nodes[0]["@id"]);
    expect(nodes[1].offers.map((offer: { price: string; priceCurrency: string }) => [offer.price, offer.priceCurrency])).toEqual([
      ["0", "EUR"], ["12", "EUR"], ["49", "EUR"], ["120", "EUR"], ["490", "EUR"], ["19", "EUR"],
    ]);
    expect(html).toContain(locale === "fr" ? "pas encore été testé" : "not yet been tested");
  });
});
