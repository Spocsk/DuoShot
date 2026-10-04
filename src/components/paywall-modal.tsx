"use client";

import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";
import { Overlay } from "@/components/overlay";
import { ONE_TIME_CATALOG, formatEurFromCents, type PurchaseKind } from "@/lib/plans";

export function PaywallModal({
  locale,
  reason,
  busy,
  available = false,
  passAvailable = false,
  preferredKind,
  onClose,
  onCheckout,
}: {
  locale: Locale;
  reason: "trial" | "69";
  busy: boolean;
  available?: boolean;
  /** The one-time pass has its own Stripe price; offered only when it is configured. */
  passAvailable?: boolean;
  preferredKind?: PurchaseKind;
  onClose: () => void;
  onCheckout: (kind: PurchaseKind) => void;
}) {
  const { t, tf } = useI18n();
  const yearly = preferredKind?.endsWith("_yearly") ?? false;
  const pass = preferredKind === "pass30";
  const passPrice = formatEurFromCents(ONE_TIME_CATALOG.pass30.amountCents, locale);
  return (
    <Overlay onClose={onClose} labelledBy="paywall-title" closeLabel={t("asct_close")}>
      <h2 id="paywall-title" data-testid="paywall" className="font-display text-3xl">
        {pass ? t("pricing_pass_title") : reason === "69" ? t("paywall_69") : t("paywall_title")}
      </h2>
      <p className="mt-3 text-[var(--muted)]">{pass ? t("pricing_pass_body") : t("paywall_lead")}</p>
      {(pass ? !passAvailable : !available) ? <p role="status" className="mt-3 text-sm">{t("account_payments_not_open_yet")}</p> : null}
      {pass ? (
        <button
          type="button"
          className="ds-cta mt-6 w-full"
          data-testid="paywall-cta-pass30"
          disabled={busy || !passAvailable}
          onClick={() => onCheckout("pass30")}
        >
          {tf("pricing_pass_cta", { price: passPrice })}
        </button>
      ) : null}
      <button
        type="button"
        className={pass ? "ds-cta-ghost mt-3 w-full" : "ds-cta mt-6 w-full"}
        data-testid="paywall-cta-indie"
        disabled={busy || !available}
        onClick={() => onCheckout(yearly ? "indie_yearly" : "indie_monthly")}
      >
        {yearly ? t("paywall_indie_120_year") : t("paywall_cta_indie")}
      </button>
      {pass ? null : (
        <button
          type="button"
          className="ds-cta-ghost mt-3 w-full"
          data-testid="paywall-cta-studio"
          disabled={busy || !available}
          onClick={() => onCheckout(yearly ? "studio_yearly" : "studio_monthly")}
        >
          {yearly ? t("paywall_studio_490_year") : t("paywall_cta_studio")}
        </button>
      )}
      <button
        type="button"
        className="ds-text-btn mt-3 w-full justify-center"
        data-testid="paywall-later"
        onClick={onClose}
      >
        {t("paywall_later")}
      </button>
    </Overlay>
  );
}
