import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/components/i18n-provider";
import { getMessages, getTranslator } from "@/lib/i18n";
import { DEFAULT_CALL_BOOKING_URL } from "@/lib/call-offer";
import type { Locale } from "@/lib/specs";
import type { BillingStatus } from "./use-billing";
import { ExportOffers, shouldShowExportOffers } from "./export-offers";
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
    const html = render(locale, createElement(ExportOffers, { session: "out", billing: null }));

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
    expect(render(locale, createElement(ExportOffers, { session: "out", billing: null }))).toBe("");
  });

  it("hides the insert from accounts that already have the access it sells", () => {
    const indie: BillingStatus = { plan: "indie" };
    const studio: BillingStatus = { plan: "studio" };
    // A pass is projected as plan "indie" with a future passExpiresAt; both signals mean "already in".
    const activePass: BillingStatus = { plan: "indie", passExpiresAt: "2999-01-01T00:00:00Z" };
    for (const billing of [indie, studio, activePass]) {
      expect(render(locale, createElement(ExportOffers, { session: "in", billing }))).toBe("");
    }
  });

  it("shows the insert to a free account whose pass has expired", () => {
    const expired: BillingStatus = { plan: "free", passExpiresAt: "2000-01-01T00:00:00Z" };
    expect(render(locale, createElement(ExportOffers, { session: "in", billing: expired }))).toContain(
      'data-testid="tool-export-offers"',
    );
  });

  it("hides the insert while a signed-in account's status is still unknown", () => {
    expect(render(locale, createElement(ExportOffers, { session: "loading", billing: null }))).toBe("");
    expect(render(locale, createElement(ExportOffers, { session: "in", billing: null }))).toBe("");
  });
});

describe("shouldShowExportOffers", () => {
  it("shows for guests and free accounts, hides for paid access, loading and in-flight billing", () => {
    expect(shouldShowExportOffers("out", null)).toBe(true);
    expect(shouldShowExportOffers("in", { plan: "free" })).toBe(true);
    expect(shouldShowExportOffers("in", { plan: "free", passExpiresAt: "2000-01-01T00:00:00Z" })).toBe(true);
    expect(shouldShowExportOffers("in", { plan: "indie" })).toBe(false);
    expect(shouldShowExportOffers("in", { plan: "studio" })).toBe(false);
    expect(shouldShowExportOffers("in", { plan: "indie", passExpiresAt: "2999-01-01T00:00:00Z" })).toBe(false);
    expect(shouldShowExportOffers("loading", null)).toBe(false);
    expect(shouldShowExportOffers("in", null)).toBe(false);
  });
});

describe("export panel gating", () => {
  const base = {
    locale: "fr" as const,
    prefix: "",
    session: "out" as const,
    billing: null,
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
