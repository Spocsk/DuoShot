"use client";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { Overlay } from "@/components/overlay";
import type { CheckoutKind } from "@/lib/plans";

export function PaywallModal({
  locale,
  reason,
  busy,
  preferredKind,
  onClose,
  onCheckout,
}: {
  locale: Locale;
  reason: "trial" | "69";
  busy: boolean;
  preferredKind?: CheckoutKind;
  onClose: () => void;
  onCheckout: (kind: CheckoutKind) => void;
}) {
  const yearly = preferredKind?.endsWith("_yearly") ?? false;
  return (
    <Overlay onClose={onClose} labelledBy="paywall-title">
      <h2 id="paywall-title" data-testid="paywall" className="font-display text-3xl">
        {reason === "69" ? t(locale, "paywall_69") : t(locale, "paywall_title")}
      </h2>
      <p className="mt-3 text-[var(--muted)]">{t(locale, "paywall_lead")}</p>
      <button
        type="button"
        className="ds-cta mt-6 w-full"
        data-testid="paywall-cta-indie"
        disabled={busy}
        onClick={() => onCheckout(yearly ? "indie_yearly" : "indie_monthly")}
      >
        {yearly ? (locale === "fr" ? "Indie · 120 € / an" : "Indie · €120 / year") : t(locale, "paywall_cta_indie")}
      </button>
      <button
        type="button"
        className="ds-cta-ghost mt-3 w-full"
        data-testid="paywall-cta-studio"
        disabled={busy}
        onClick={() => onCheckout(yearly ? "studio_yearly" : "studio_monthly")}
      >
        {yearly ? (locale === "fr" ? "Studio · 490 € / an" : "Studio · €490 / year") : t(locale, "paywall_cta_studio")}
      </button>
      <button
        type="button"
        className="ds-text-btn mt-3 w-full justify-center"
        data-testid="paywall-later"
        onClick={onClose}
      >
        {t(locale, "paywall_later")}
      </button>
    </Overlay>
  );
}
