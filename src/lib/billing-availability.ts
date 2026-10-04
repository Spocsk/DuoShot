import { billingEnvironmentMatches, billingUserAllowed } from "./billing-environment";
import { pass30PriceId } from "./plans";
import { serverEnv } from "./env";

export function checkoutAvailable(userId?: string) {
  const { stripe } = serverEnv;
  const key = stripe.secretKey ?? "";
  const live = /^(sk|rk)_live_/.test(key);
  return billingEnvironmentMatches() && billingUserAllowed(userId) && stripe.checkoutEnabled && Boolean(
    key && stripe.webhookSecret && serverEnv.supabase.adminKey &&
    stripe.prices.indieMonthly && stripe.prices.indieYearly &&
    stripe.prices.studioMonthly && stripe.prices.studioYearly
  ) && (!live || stripe.liveEnabled);
}

/** The one-time pass is offered only once its Stripe price is configured. */
export function passCheckoutAvailable(userId?: string) {
  return checkoutAvailable(userId) && Boolean(pass30PriceId());
}

/**
 * What the pricing page renders. Identical to checkoutAvailable() except for the CI
 * end-to-end run, which has no Stripe credentials and stubs /api/stripe/checkout in
 * the browser: E2E_CHECKOUT_DISPLAY=true then enables the buttons. It is ignored on
 * production or with a live key, and the checkout route never reads it.
 */
export function checkoutDisplayAvailable() {
  if (checkoutAvailable()) return true;
  const live = /^(sk|rk)_live_/.test(serverEnv.stripe.secretKey ?? "");
  return serverEnv.billing.e2eCheckoutDisplay && !serverEnv.isProduction && !live;
}
