import Stripe from "stripe";
import { billingEnvironmentMatches } from "./billing-environment";
import { serverEnv } from "./env";

export function isStripeConfigured(): boolean {
  return billingEnvironmentMatches();
}

export function getStripe(): Stripe | null {
  const key = serverEnv.stripe.secretKey;
  if (!key || !billingEnvironmentMatches()) return null;
  return new Stripe(key);
}
