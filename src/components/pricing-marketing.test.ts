import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { connection } from "next/server";
import HomeRoute from "@/app/[locale]/page";
import { generateMetadata } from "@/app/[locale]/pricing/page";
import { checkoutDisplayAvailable, passCheckoutAvailable } from "@/lib/billing-availability";
import { getMessages, getTranslator, FAQ } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { I18nProvider } from "./i18n-provider";
import { PricingSection } from "./pricing-section";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/billing-availability", () => ({
  checkoutDisplayAvailable: vi.fn(),
  passCheckoutAvailable: vi.fn(),
}));

// Different offers prove that the rendered copy follows configuration, including
// the FAQ and metadata that used to duplicate production prices and quotas.
vi.mock("@/lib/plans", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plans")>();
  return {
    ...actual,
    FREE_EXPORTS: 5,
    PLANS: {
      free: { ...actual.PLANS.free, freeExports: 5 },
      indie: { ...actual.PLANS.indie, monthlyEur: 18, yearlyEur: 180, dailyHdSets: 150 },
      studio: { ...actual.PLANS.studio, monthlyEur: 69, yearlyEur: 690, seats: 6 },
    },
    ONE_TIME_CATALOG: {
      pass30: { ...actual.ONE_TIME_CATALOG.pass30, days: 45, amountCents: 2900 },
    },
  };
});

function render(locale: Locale, child: ReactElement) {
  return renderToStaticMarkup(createElement(I18nProvider, { locale, messages: getMessages(locale) } as ComponentProps<typeof I18nProvider>, child));
}

function checkoutButton(html: string, kind: string) {
  const button = html.match(new RegExp(`<button[^>]*data-testid="pricing-cta-${kind}"[^>]*>`));
  expect(button, kind).not.toBeNull();
  return button![0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkoutDisplayAvailable).mockReturnValue(true);
  vi.mocked(passCheckoutAvailable).mockReturnValue(true);
});

describe.each(["fr", "en"] as const)("%s commercial copy and initial rendering", (locale) => {
  it("renders home checkout buttons from request-time availability, without a billing toggle", async () => {
    const html = render(locale, await HomeRoute({ params: Promise.resolve({ locale }) }));
    expect(connection).toHaveBeenCalledOnce();
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(checkoutDisplayAvailable).mock.invocationCallOrder[0]);
    for (const kind of ["indie_monthly", "studio_monthly", "pass30"]) {
      expect(checkoutButton(html, kind)).not.toContain("disabled");
    }
    expect(html).not.toContain("billing-monthly");
    expect(html).not.toContain("billing-yearly");
    expect(html).not.toContain(getTranslator(locale).t("pricing_payments_unavailable"));
  });

  it("keeps unavailable checkout disabled and omits an unconfigured pass on home", async () => {
    vi.mocked(checkoutDisplayAvailable).mockReturnValue(false);
    vi.mocked(passCheckoutAvailable).mockReturnValue(false);
    const html = render(locale, await HomeRoute({ params: Promise.resolve({ locale }) }));
    expect(checkoutButton(html, "indie_monthly")).toContain("disabled");
    expect(checkoutButton(html, "studio_monthly")).toContain("disabled");
    expect(html).toContain(locale === "fr" ? "Paiement indisponible" : "Checkout unavailable");
    expect(html).not.toContain(locale === "fr" ? "bientôt" : "soon");
    expect(html).not.toContain('data-testid="pricing-pass30"');
  });

  it("keeps the pricing toggle and derives offer copy from plans", () => {
    const html = render(locale, createElement(PricingSection, { locale, checkoutAvailable: true, passAvailable: true }));
    expect(html).toContain('data-testid="billing-monthly"');
    expect(html).toContain('data-testid="billing-yearly"');
    expect(html).toContain("5 exports");
    expect(html).toContain("150 exports");
    expect(html).toContain(locale === "fr" ? "6 sièges" : "6 seats");
    expect(html).toContain(locale === "fr" ? "18 €/mois" : "€18/month");
    expect(html).toContain(locale === "fr" ? "69 €/mois" : "€69/month");
    expect(html).toContain(locale === "fr" ? "Pass 45 jours — 29 €" : "45-day pass — €29");
    expect(html).not.toMatch(/\{(?:exports|dailyCap|seats|days|price|months)\}/);
    expect(html).not.toContain('class="studio-plan-local"');
  });

  it("keeps configured prices and the shared Studio benefits in the FAQ and metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.description).toContain(locale === "fr" ? "Essai gratuit avec 5 exports" : "Free trial with 5 exports");
    expect(metadata.description).toContain(locale === "fr" ? "18 €/mois" : "€18/month");
    expect(metadata.description).toContain(locale === "fr" ? "69 €/mois" : "€69/month");
    const payment = FAQ[locale].find(({ q }) => q === (locale === "fr" ? "Comment ça se paie ?" : "How does payment work?"))!;
    expect(payment.a).toContain("5 exports");
    for (const price of [18, 180, 69, 690]) {
      expect(payment.a).toContain(locale === "fr" ? `${price} €` : `€${price}`);
    }
    const studio = FAQ[locale].find(({ q }) => q.includes("Studio"))!;
    expect(studio.a).toBe(getTranslator(locale).tf("pricing_local_projects", { seats: 6 }));
    expect(studio.a).toContain(locale === "fr" ? "liens de validation" : "review links");
  });
});
