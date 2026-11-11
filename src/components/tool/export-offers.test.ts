import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { getMessages, getTranslator } from "@/lib/i18n";
import { DEFAULT_CALL_BOOKING_URL } from "@/lib/call-offer";
import type { Locale } from "@/lib/specs";
import { ExportOffers } from "./export-offers";
import { ExportPanel } from "./delivery-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function render(locale: Locale, child: ReactElement) {
  // Intl inserts (narrow) no-break spaces in prices; compare on plain spaces.
  return renderToStaticMarkup(
    createElement(I18nProvider, { locale, messages: getMessages(locale) } as ComponentProps<typeof I18nProvider>, child),
  ).replace(/[\u00a0\u202f]/g, " ");
}

afterEach(() => vi.unstubAllGlobals());

describe.each(["fr", "en"] as const)("after-export offers (%s)", (locale) => {
  it("bundles the EARLY50 Indie deal and the 15-min call offer behind an accessible close", () => {
    const { t } = getTranslator(locale);
    const html = render(locale, createElement(ExportOffers));

    expect(html).toContain('data-testid="tool-export-offers"');
    expect(html).toContain('data-testid="pricing-early50"');
    expect(html).toContain("EARLY50");
    expect(html).toContain(locale === "fr" ? "6 €/mois" : "€6/month");
    expect(html).toContain(locale === "fr" ? "20 premiers abonnés" : "first 20 Indie subscribers");
    // The default booking URL is https, so the call CTA renders.
    expect(html).toContain(`href="${DEFAULT_CALL_BOOKING_URL}"`);
    expect(html).toContain(t("call_offer_cta"));
    expect(html).toContain(`aria-label="${t("tool_export_offers_close")}"`);
    expect(html).not.toMatch(/restant|left|remaining/i);
  });

  it("renders nothing once dismissed for the session", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => (key === "duoshot:export-offers:closed" ? "1" : null),
      setItem: () => {},
    });
    expect(render(locale, createElement(ExportOffers))).toBe("");
  });
});

describe("export panel gating", () => {
  const base = {
    locale: "fr" as const,
    prefix: "",
    session: "in" as const,
    orientation: "portrait" as const,
    demo: false,
    jobs: { exportImages: [] } as unknown as ComponentProps<typeof ExportPanel>["jobs"],
  };

  it("shows the offers only after a successful export", () => {
    const done = render("fr", createElement(ExportPanel, { ...base, zipUrl: "https://storage.example/app.zip" }));
    expect(done).toContain('data-testid="tool-export-offers"');

    const pending = render("fr", createElement(ExportPanel, { ...base, zipUrl: null }));
    expect(pending).not.toContain('data-testid="tool-export-offers"');
  });
});
