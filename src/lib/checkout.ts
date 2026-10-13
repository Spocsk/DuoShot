import { PRO_CHECKOUT_KIND, isOneTimeKind, type CheckoutKind, type PurchaseKind } from "./plans";
import { localePrefix } from "./site";
import type { Locale } from "./specs";
import { trackProduct } from "./analytics-client";
import type { MessageKey, Translator } from "./i18n/types";

export { PRO_CHECKOUT_KIND };

export function billingErrorKey(code?: string): MessageKey {
  const messages: Record<string, MessageKey> = {
    AUTH_REQUIRED: "billing_error_auth",
    BILLING_OWNER_REQUIRED: "billing_error_owner",
    BILLING_UNCONFIGURED: "billing_error_unconfigured",
    ACTIVATION_PENDING: "billing_error_activation",
    CHECKOUT_EXPIRED: "billing_error_expired",
    NO_BILLING_CUSTOMER: "billing_error_no_customer",
  };
  return messages[code ?? ""] ?? "billing_error_unavailable";
}

class CheckoutError extends Error {}

export async function startCheckout(kind: PurchaseKind, nextPath: string, t: Translator["t"]): Promise<void> {
  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, next: nextPath }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (response.status === 409 && payload.error === "SUBSCRIPTION_EXISTS") {
      const portalResponse = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextPath.startsWith("/en/") ? "en" : "fr" }),
      });
      const portal = (await portalResponse.json()) as { url?: string; error?: string };
      if (!portalResponse.ok || !portal.url) throw new CheckoutError(t(billingErrorKey(portal.error)));
      window.location.assign(portal.url);
      return;
    }
    if (!response.ok || !payload.url) throw new CheckoutError(t(billingErrorKey(payload.error)));
    await trackProduct("checkout_started", { plan: kind });
    window.location.assign(payload.url);
  } catch (error) {
    throw error instanceof CheckoutError ? error : new CheckoutError(t("billing_error_unavailable"));
  }
}

export async function startProCheckout(nextPath: string, t: Translator["t"]): Promise<void> {
  return startCheckout(PRO_CHECKOUT_KIND, nextPath, t);
}

export function checkoutReturnPath(locale: Locale): string {
  return `${localePrefix(locale)}/tool`;
}

export function isCheckoutKind(value: string | undefined): value is CheckoutKind {
  return value === "indie_monthly" || value === "studio_monthly" || value === "indie_yearly" || value === "studio_yearly";
}

/** Any plan the tool's upgrade link may carry: subscriptions and the one-time pass. */
export function isPurchaseKind(value: string | undefined): value is PurchaseKind {
  return isCheckoutKind(value) || isOneTimeKind(value);
}
