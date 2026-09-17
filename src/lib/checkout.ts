import { CHECKOUT_CATALOG, PRO_CHECKOUT_KIND, type CheckoutKind } from "./plans";
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
  return Boolean(value && value in CHECKOUT_CATALOG);
}
