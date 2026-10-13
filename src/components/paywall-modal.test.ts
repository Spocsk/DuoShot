import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useI18n } from "@/components/i18n-provider";
import { createTranslator, getClientMessages, getTranslator } from "@/lib/i18n";
import { FREE_EXPORTS, PASS30, PLANS, PRO_DAILY_CAP, formatEurFromCents } from "@/lib/plans";
import { explainError } from "./tool/errors";
import { quotaLabel } from "./tool/use-billing";
import { PaywallModal } from "./paywall-modal";

vi.mock("@/components/i18n-provider", () => ({ useI18n: vi.fn() }));

// Different catalog values expose copy that accidentally embeds the production numbers.
vi.mock("@/lib/plans", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plans")>();
  return {
    ...actual,
    FREE_EXPORTS: 5,
    PRO_DAILY_CAP: 80,
    PLANS: {
      ...actual.PLANS,
      indie: { ...actual.PLANS.indie, monthlyEur: 15, yearlyEur: 150 },
      studio: { ...actual.PLANS.studio, monthlyEur: 59, yearlyEur: 590 },
    },
    PASS30: { ...actual.PASS30, days: 45, priceEur: 29 },
    ONE_TIME_CATALOG: { pass30: { ...actual.ONE_TIME_CATALOG.pass30, days: 45, amountCents: 2900 } },
  };
});

function renderPaywall(props: Partial<ComponentProps<typeof PaywallModal>> = {}) {
  const locale = props.locale ?? "fr";
  vi.mocked(useI18n).mockReturnValue(createTranslator(locale, getClientMessages(locale, "app")));
  return renderToStaticMarkup(createElement(PaywallModal, {
    locale,
    reason: "69",
    busy: false,
    onClose() {},
    onCheckout() {},
    ...props,
  }));
}

function button(markup: string, testId: string) {
  const tag = markup.match(new RegExp(`<button\\b[^>]*data-testid="${testId}"[^>]*>`));
  expect(tag, `Missing button ${testId}`).not.toBeNull();
  return tag![0];
}

describe.each(["fr", "en"] as const)("%s paywall checkout availability", (locale) => {
  const closedMessage = getTranslator(locale).t("billing_error_unavailable");

  it.each(["trial", "69"] as const)("offers checkout for the %s paywall when payments are open", (reason) => {
    const markup = renderPaywall({ locale, reason, available: true });
    expect(markup).not.toContain(closedMessage);
    expect(button(markup, "paywall-cta-indie")).not.toContain("disabled");
    expect(button(markup, "paywall-cta-studio")).not.toContain("disabled");
  });

  it("keeps subscription checkout open when the preferred pass is unavailable", () => {
    const markup = renderPaywall({ locale, available: true, passAvailable: false, preferredKind: "pass30" });
    expect(markup).not.toContain(closedMessage);
    expect(button(markup, "paywall-cta-pass30")).toContain("disabled");
    expect(button(markup, "paywall-cta-indie")).not.toContain("disabled");
  });

  it("does not describe a busy checkout as closed", () => {
    const markup = renderPaywall({ locale, available: true, busy: true });
    expect(markup).not.toContain(closedMessage);
    expect(button(markup, "paywall-cta-indie")).toContain("disabled");
  });

  it("offers an available pass even when subscriptions are unavailable", () => {
    const markup = renderPaywall({ locale, available: false, passAvailable: true, preferredKind: "pass30" });
    expect(markup).not.toContain(closedMessage);
    expect(button(markup, "paywall-cta-pass30")).not.toContain("disabled");
    expect(button(markup, "paywall-cta-indie")).toContain("disabled");
  });

  it("reports unavailable payments only when no displayed offering can be purchased", () => {
    const markup = renderPaywall({ locale, available: false, passAvailable: false, preferredKind: "pass30" });
    expect(markup).toContain(closedMessage);
    expect(button(markup, "paywall-cta-pass30")).toContain("disabled");
    expect(button(markup, "paywall-cta-indie")).toContain("disabled");
  });
});

describe.each(["fr", "en"] as const)("commercial copy in %s", (locale) => {
  it.each([false, true])("reads paywall prices and quotas from plans (yearly=%s)", (yearly) => {
    const html = renderPaywall({ locale, reason: "trial", available: true, preferredKind: yearly ? "indie_yearly" : "indie_monthly" });
    for (const plan of [PLANS.indie, PLANS.studio]) {
      expect(html).toContain(formatEurFromCents((yearly ? plan.yearlyEur : plan.monthlyEur) * 100, locale));
    }
    expect(html).toContain(`${FREE_EXPORTS} ${locale === "fr" ? "exports gratuits" : "free exports"}`);
    expect(html).toContain(`${PRO_DAILY_CAP} ${locale === "fr" ? "exports HD" : "HD exports"}`);
    expect(html).not.toMatch(/\{(?:price|exports|dailyCap)\}/);
  });

  it("reads the one-time pass price and duration from plans", () => {
    const html = renderPaywall({ locale, available: true, passAvailable: true, preferredKind: "pass30" });
    expect(html).toContain(formatEurFromCents(PASS30.priceEur * 100, locale));
    expect(html).toContain(locale === "fr" ? `Pass ${PASS30.days} jours` : `${PASS30.days}-day pass`);
    expect(html).not.toMatch(/\{(?:price|days)\}/);
  });

  it("uses exports for the tool pill and exhausted quota message", () => {
    const i18n = getTranslator(locale);
    expect(quotaLabel(i18n, { plan: "free", remainingFreeExports: 2 }, false, "in"))
      .toBe(locale === "fr" ? "2 exports restants" : "2 exports left");
    expect(quotaLabel(i18n, { plan: "free", remainingFreeExports: 1 }, false, "in"))
      .toBe(locale === "fr" ? "1 export restant" : "1 export left");
    expect(quotaLabel(i18n, { plan: "free", remainingFreeExports: 0 }, false, "in"))
      .toBe(locale === "fr" ? "Exports utilisés" : "Exports used");
    expect(explainError(i18n, "TRIAL_EXHAUSTED"))
      .toContain(`${FREE_EXPORTS} ${locale === "fr" ? "exports gratuits" : "free exports"}`);
    expect(i18n.t("account_plan_free")).toBe(i18n.t("pricing_trial_title"));
  });
});
