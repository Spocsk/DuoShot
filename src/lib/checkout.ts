import { PRO_CHECKOUT_KIND, type CheckoutKind } from "./plans";
import { localePrefix } from "./site";
import type { Locale } from "./specs";

export { PRO_CHECKOUT_KIND };

export async function startCheckout(kind: CheckoutKind, nextPath: string): Promise<void> {
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
    if (!portalResponse.ok || !portal.url) throw new Error(portal.error || "BILLING_UNAVAILABLE");
    window.location.assign(portal.url);
    return;
  }
  if (!payload.url) {
    throw new Error(payload.error || "CHECKOUT_UNAVAILABLE");
  }
  window.location.assign(payload.url);
}

export async function startProCheckout(nextPath: string): Promise<void> {
  return startCheckout(PRO_CHECKOUT_KIND, nextPath);
}

export function checkoutReturnPath(locale: Locale): string {
  return `${localePrefix(locale)}/tool`;
}

export function isCheckoutKind(value: string | undefined): value is CheckoutKind {
  return value === "indie_monthly" || value === "studio_monthly" || value === "indie_yearly" || value === "studio_yearly";
}
