import { billingEnvironmentMatches, billingUserAllowed } from "./billing-environment";
import { pass30PriceId } from "./plans";

export function checkoutAvailable(userId?: string) {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const live = /^(sk|rk)_live_/.test(key);
  return billingEnvironmentMatches() && billingUserAllowed(userId) && process.env.STRIPE_CHECKOUT_ENABLED === "true" && Boolean(
    key && process.env.STRIPE_WEBHOOK_SECRET &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) &&
    process.env.STRIPE_INDIE_PRICE_ID && process.env.STRIPE_INDIE_YEARLY_PRICE_ID &&
    process.env.STRIPE_STUDIO_PRICE_ID && process.env.STRIPE_STUDIO_YEARLY_PRICE_ID
  ) && (!live || process.env.STRIPE_LIVE_ENABLED === "true");
}

/** The one-time pass is offered only once its Stripe price is configured. */
export function passCheckoutAvailable(userId?: string) {
  return checkoutAvailable(userId) && Boolean(pass30PriceId());
}
