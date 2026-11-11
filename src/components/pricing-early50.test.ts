import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getMessages } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { I18nProvider } from "./i18n-provider";
import { PricingSection } from "./pricing-section";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// No PLANS mock: the EARLY50 copy must derive 6 €/60 € from the real indie prices (12/120).
function render(locale: Locale) {
  // Intl inserts (narrow) no-break spaces in prices; compare on plain spaces.
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { locale, messages: getMessages(locale) } as ComponentProps<typeof I18nProvider>,
      createElement(PricingSection, { locale, checkoutAvailable: true, passAvailable: true }),
    ),
  ).replace(/[\u00a0\u202f]/g, " ");
}

/** The single <article> for a plan or pass, so a claim can be scoped to one card. */
function article(html: string, plan: string) {
  const match = html.match(new RegExp(`<article\\b[^>]*data-plan="${plan}"[^>]*>[\\s\\S]*?</article>`));
  expect(match, plan).not.toBeNull();
  return match![0];
}

describe.each(["fr", "en"] as const)("EARLY50 launch deal on the Indie card (%s)", (locale) => {
  const html = render(locale);
  const indie = article(html, "indie");
  const studio = article(html, "studio");
  const pass = article(html, "pass30");

  it("appears on Indie but not on Studio or the pass", () => {
    expect(indie).toContain('data-testid="pricing-early50"');
    expect(indie).toContain("EARLY50");
    for (const other of [studio, pass]) {
      expect(other).not.toContain('data-testid="pricing-early50"');
      expect(other).not.toContain("EARLY50");
    }
  });

  it("shows the halved and full prices derived from the indie plan", () => {
    expect(indie).toContain(locale === "fr" ? "6 €/mois" : "€6/month");
    expect(indie).toContain(locale === "fr" ? "60 €/an" : "€60/year");
    expect(indie).toContain(locale === "fr" ? "au lieu de 12 € ou 120 €" : "instead of €12 or €120");
  });

  it("names the first 20 subscribers with no seats counter and never says Pro", () => {
    const block = indie.match(/<div[^>]*data-testid="pricing-early50"[\s\S]*?<\/div>/)![0];
    expect(block).toContain(locale === "fr" ? "20 premiers abonnés" : "first 20 Indie subscribers");
    expect(block).not.toMatch(/restant|left|remaining/i);
    expect(block).not.toContain("Pro");
  });
});
