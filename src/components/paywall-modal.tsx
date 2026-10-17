"use client";

import { Button } from "@/components/ui/button";

import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";
import { Overlay } from "@/components/overlay";
import { FREE_EXPORTS, ONE_TIME_CATALOG, PASS30, PLANS, PRO_DAILY_CAP, formatEurFromCents, type PurchaseKind } from "@/lib/plans";

export function PaywallModal({
  locale,
  reason,
  busy,
  error,
  available = false,
  passAvailable = false,
  preferredKind,
  onClose,
  onCheckout,
}: {
  locale: Locale;
  reason: "trial" | "69";
  busy: boolean;
  error?: string | null;
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
  const indiePrice = formatEurFromCents((yearly ? PLANS.indie.yearlyEur : PLANS.indie.monthlyEur) * 100, locale);
  const studioPrice = formatEurFromCents((yearly ? PLANS.studio.yearlyEur : PLANS.studio.monthlyEur) * 100, locale);
  return (
    <Overlay onClose={onClose} labelledBy="paywall-title" closeLabel={t("paywall_close")}>
      <h2 id="paywall-title" data-testid="paywall" className="font-display text-3xl">
        {pass ? tf("pricing_pass_title", { days: PASS30.days }) : reason === "69" ? t(passAvailable ? "paywall_69" : "paywall_69_without_pass") : tf("paywall_title", { exports: FREE_EXPORTS })}
      </h2>
      <p className="mt-3 text-[var(--muted)]">{pass ? tf("pricing_pass_body", { days: PASS30.days }) : tf(passAvailable ? "paywall_lead" : "paywall_lead_without_pass", { dailyCap: PRO_DAILY_CAP })}</p>
      {!available && (!pass || !passAvailable) ? <p role="status" className="mt-3 text-sm">{t("billing_error_unavailable")}</p> : null}
      {error ? <p role="alert" className="ds-warn mt-3 text-sm">{error}</p> : null}
      {pass ? (
        <Button as="button" variant="primary"
          type="button"
          className="mt-6 w-full"
          data-testid="paywall-cta-pass30"
          disabled={busy || !passAvailable}
          onClick={() => onCheckout("pass30")}
       >
          {tf("pricing_pass_cta", { days: PASS30.days, price: passPrice })}
        </Button>
      ) : null}
      <Button as="button" variant={pass ? "secondary" : "primary"}
        type="button"
        className={pass ? "mt-3 w-full" : "mt-6 w-full"}
        data-testid="paywall-cta-indie"
        disabled={busy || !available}
        onClick={() => onCheckout(yearly ? "indie_yearly" : "indie_monthly")}
     >
        {tf(yearly ? "paywall_indie_year" : "paywall_cta_indie", { price: indiePrice })}
      </Button>
      {pass ? null : (
        <Button as="button" variant="secondary"
          type="button"
          className="mt-3 w-full"
          data-testid="paywall-cta-studio"
          disabled={busy || !available}
          onClick={() => onCheckout(yearly ? "studio_yearly" : "studio_monthly")}
       >
          {tf(yearly ? "paywall_studio_year" : "paywall_cta_studio", { price: studioPrice })}
        </Button>
      )}
      <Button as="button" variant="text"
        type="button"
        className="mt-3 w-full justify-center"
        data-testid="paywall-later"
        onClick={onClose}
     >
        {t("paywall_later")}
      </Button>
    </Overlay>
  );
}
