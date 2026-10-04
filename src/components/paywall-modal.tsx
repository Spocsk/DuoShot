"use client";

import { t, tf } from "@/lib/i18n";
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
  const yearly = preferredKind?.endsWith("_yearly") ?? false;
  const pass = preferredKind === "pass30";
  const passPrice = formatEurFromCents(ONE_TIME_CATALOG.pass30.amountCents, locale);
  return (
    <Overlay onClose={onClose} labelledBy="paywall-title" closeLabel={locale === "fr" ? "Fermer" : "Close"}>
      <h2 id="paywall-title" data-testid="paywall" className="font-display text-3xl">
        {pass ? t(locale, "pricing_pass_title") : reason === "69" ? t(locale, "paywall_69") : t(locale, "paywall_title")}
      </h2>
      <p className="mt-3 text-[var(--muted)]">{pass ? t(locale, "pricing_pass_body") : t(locale, "paywall_lead")}</p>
      {(pass ? !passAvailable : !available) ? <p role="status" className="mt-3 text-sm">{locale === "fr" ? "Les paiements ne sont pas encore ouverts." : "Payments are not open yet."}</p> : null}
      {pass ? (
        <button
          type="button"
          className="ds-cta mt-6 w-full"
          data-testid="paywall-cta-pass30"
          disabled={busy || !passAvailable}
          onClick={() => onCheckout("pass30")}
        >
          {tf(locale, "pricing_pass_cta", { price: passPrice })}
        </button>
      ) : null}
      <button
        type="button"
        className={pass ? "ds-cta-ghost mt-3 w-full" : "ds-cta mt-6 w-full"}
        data-testid="paywall-cta-indie"
        disabled={busy || !available}
        onClick={() => onCheckout(yearly ? "indie_yearly" : "indie_monthly")}
      >
        {yearly ? (locale === "fr" ? "Indie · 120 € / an" : "Indie · €120 / year") : t(locale, "paywall_cta_indie")}
      </button>
      {pass ? null : (
        <button
          type="button"
          className="ds-cta-ghost mt-3 w-full"
          data-testid="paywall-cta-studio"
          disabled={busy || !available}
          onClick={() => onCheckout(yearly ? "studio_yearly" : "studio_monthly")}
        >
          {yearly ? (locale === "fr" ? "Studio · 490 € / an" : "Studio · €490 / year") : t(locale, "paywall_cta_studio")}
        </button>
      )}
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
