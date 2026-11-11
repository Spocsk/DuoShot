"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { CALL_BOOKING_URL } from "@/lib/call-offer";
import { Early50Note } from "@/components/pricing-section";
import { activePassUntil } from "@/lib/billing";
import type { BillingStatus, SessionState } from "@/components/tool/use-billing";

const STORAGE_KEY = "duoshot:export-offers:closed";

/**
 * Whether the after-export offers insert should appear. We hide it from anyone who already has the
 * access it sells: plan "indie"/"studio" (Stripe sub, trial or workspace grant) or an active Pass
 * (a Pass grants the Indie equivalent for 30 days, so promoting EARLY50 right after they paid makes
 * no sense). While we are still resolving a signed-in account's status (session "in" without billing,
 * loading or errored) we hide too, to avoid flashing the insert at a subscriber. Guests (session
 * "out") and free accounts without an active Pass see it.
 */
export function shouldShowExportOffers(
  session: SessionState,
  billing: Pick<BillingStatus, "plan" | "passExpiresAt"> | null,
): boolean {
  if (session === "loading") return false;
  if (session === "in") {
    if (!billing) return false;
    if (billing.plan === "indie" || billing.plan === "studio") return false;
    if (activePassUntil(billing.passExpiresAt)) return false;
  }
  return true;
}

/** Only https links are rendered; anything else (or an unparseable value) is treated as unset. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Discreet insert rendered only after a successful export (ZIP ready in the Export panel). It
 * bundles the EARLY50 Indie deal (same copy as /pricing, no seats counter) and the existing
 * "15-min call = 7 days of Pro" offer, reusing the call_offer_* keys and CALL_BOOKING_URL. The
 * call link follows the CallCtaCard rule: it renders nothing when the URL is not https. The
 * insert is dismissible (accessible close button) and the dismissal is remembered for the
 * session. Export logic and Umami instrumentation are untouched.
 */
export function ExportOffers({ session, billing }: {
  session: SessionState;
  billing: BillingStatus | null;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const [closed, setClosed] = useState(() => {
    try {
      return typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (closed) return null;
  if (!shouldShowExportOffers(session, billing)) return null;
  const callHref = CALL_BOOKING_URL && isHttpsUrl(CALL_BOOKING_URL) ? CALL_BOOKING_URL : null;
  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode: closing is best-effort */
    }
    setClosed(true);
  }
  return (
    <aside className="tool-export-offers" data-testid="tool-export-offers">
      <div className="tool-export-offers-head">
        <p className="ds-label">{t("tool_export_offers_title")}</p>
        <button
          type="button"
          className="tool-export-offers-close"
          data-testid="tool-export-offers-close"
          aria-label={t("tool_export_offers_close")}
          onClick={dismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <Early50Note i18n={i18n} />
      {callHref ? (
        <div className="tool-export-offers-call">
          <p className="studio-plan-early50-title">{t("call_offer_title")}</p>
          <p className="studio-plan-early50-body">{t("call_offer_body")}</p>
          <Button
            as="a"
            variant="secondary"
            href={callHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="tool-export-offers-call"
          >
            {t("call_offer_cta")}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
