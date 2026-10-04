import { useCallback, useEffect, useState } from "react";
import type { useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { Translator } from "@/lib/i18n/types";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { trackDatafastConversion } from "@/lib/datafast-client";

export type BillingStatus = {
  plan?: string;
  source?: string;
  remainingFreeExports?: number | null;
  canUse69?: boolean;
  checkoutAvailable?: boolean;
};

export type SessionState = "loading" | "out" | "in";

/**
 * Plan, quota and session state for the tool, refreshed on every auth change and
 * polled after a Stripe checkout return until the subscription is active.
 */
export function useBilling(locale: Locale, searchParams: ReturnType<typeof useSearchParams>) {
  const { t } = useI18n();
  const [billingError, setBillingError] = useState(false);
  const [activationTimedOut, setActivationTimedOut] = useState(false);
  const [activationAttempt, setActivationAttempt] = useState(0);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [session, setSession] = useState<"loading" | "out" | "in">("loading");
  const checkoutFlag = searchParams.get("checkout");
  const urlStatus =
    checkoutFlag === "success"
      ? billing?.source === "stripe" && billing.plan !== "free"
        ? t("checkout_success")
        : locale === "fr" ? (activationTimedOut ? "Activation non confirmée. Vérifiez à nouveau le statut de l’abonnement." : "Retour du paiement. Vérification de l’activation en cours…") : (activationTimedOut ? "Activation not confirmed. Check your subscription status again." : "Returned from checkout. Checking activation…")
      : checkoutFlag === "cancel"
        ? t("checkout_cancel")
        : null;

  const refreshBilling = useCallback(async () => {
    setBillingError(false);
    try {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setSession("out"); setBilling(null); return; }
      setSession("in");
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      if (!response.ok) throw new Error("BILLING_UNAVAILABLE");
      setBilling(await response.json() as BillingStatus);
    } catch { setBilling(null); setBillingError(true); }
  }, []);

  useEffect(() => {
    if (checkoutFlag !== "success" || (billing?.source === "stripe" && billing.plan !== "free")) return;
    const timer = window.setInterval(() => void refreshBilling(), 2000);
    const timeout = window.setTimeout(() => { window.clearInterval(timer); setActivationTimedOut(true); }, 60000);
    return () => { window.clearInterval(timer); window.clearTimeout(timeout); };
  }, [billing?.plan, billing?.source, checkoutFlag, refreshBilling, activationAttempt]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const plan = billing?.plan;
    if (checkoutFlag === "success" && sessionId?.startsWith("cs_") && billing?.source === "stripe" && (plan === "indie" || plan === "studio")) {
      const report = () => { void trackDatafastConversion("subscription_activated", sessionId, { plan }); };
      report();
      window.addEventListener("duoshot:analytics-choice", report);
      return () => window.removeEventListener("duoshot:analytics-choice", report);
    }
  }, [billing?.plan, billing?.source, checkoutFlag, searchParams]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    queueMicrotask(() => void refreshBilling());
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshBilling();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshBilling]);

  function retryActivation() {
    setActivationTimedOut(false);
    setActivationAttempt((n) => n + 1);
  }

  return { billing, setBilling, billingError, session, activationTimedOut, retryActivation, refreshBilling, urlStatus };
}

export function quotaLabel({ locale, t, tf }: Translator, billing: BillingStatus | null, billingError: boolean, session: SessionState) {
  const remaining = billing?.remainingFreeExports;
  const remainingLabel =
    billingError ? (locale === "fr" ? "Statut temporairement indisponible" : "Status temporarily unavailable") : !billing && session === "in"
      ? locale === "fr"
        ? "Chargement du plan…"
        : "Loading plan…"
      : billing?.plan === "studio"
      ? t("tool_plan_studio")
      : billing?.plan === "indie"
        ? t("tool_plan_indie")
        : remaining === 1
          ? t("tool_remaining_one")
          : remaining === 0
            ? t("tool_remaining_none")
            : remaining != null
              ? tf("tool_remaining", { n: remaining })
              : t("tool_guest_quota");
  return remainingLabel;
}
