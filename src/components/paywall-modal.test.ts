import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useI18n } from "@/components/i18n-provider";
import { createTranslator, getClientMessages, getTranslator } from "@/lib/i18n";
import { PaywallModal } from "./paywall-modal";

vi.mock("@/components/i18n-provider", () => ({ useI18n: vi.fn() }));

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
  const closedMessage = getTranslator(locale).t("account_payments_not_open_yet");

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
