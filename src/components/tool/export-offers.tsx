"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { CALL_BOOKING_URL } from "@/lib/call-offer";
import { Early50Note } from "@/components/pricing-section";

const STORAGE_KEY = "duoshot:export-offers:closed";

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
export function ExportOffers() {
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
