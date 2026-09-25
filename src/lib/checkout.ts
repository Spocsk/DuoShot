import { PRO_CHECKOUT_KIND, type CheckoutKind } from "./plans";
import { localePrefix } from "./site";
import type { Locale } from "./specs";
import { trackProduct } from "./analytics-client";

export { PRO_CHECKOUT_KIND };

function checkoutMessage(code: string | undefined, english: boolean): string {
  const messages: Record<string, [string, string]> = {
    AUTH_REQUIRED: ["Reconnecte-toi avant de choisir une offre.", "Sign in again before choosing a plan."],
    BILLING_OWNER_REQUIRED: ["Le propriétaire de l’espace doit gérer l’abonnement.", "The workspace owner must manage the subscription."],
    BILLING_UNCONFIGURED: ["Les paiements ne sont pas encore ouverts. Tes droits actuels restent disponibles.", "Payments are not open yet. Your current access remains available."],
    ACTIVATION_PENDING: ["L’activation est en cours. Vérifie ton compte avant de réessayer un paiement.", "Activation is pending. Check your account before attempting another payment."],
    CHECKOUT_EXPIRED: ["La session de paiement a expiré. Sélectionne à nouveau ton offre.", "The checkout session expired. Select your plan again."],
  };
  return messages[code ?? ""]?.[english ? 1 : 0] ?? (english ? "Billing is temporarily unavailable. Please retry in a moment." : "La facturation est temporairement indisponible. Réessaie dans un instant.");
}

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
    if (!portalResponse.ok || !portal.url) throw new Error(checkoutMessage(portal.error, nextPath.startsWith("/en/")));
    window.location.assign(portal.url);
    return;
  }
  if (!payload.url) {
    throw new Error(checkoutMessage(payload.error, nextPath.startsWith("/en/")));
  }
  await trackProduct("checkout_started", { plan: kind });
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
