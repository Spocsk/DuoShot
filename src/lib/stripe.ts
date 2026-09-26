import Stripe from "stripe";
import { billingEnvironmentMatches } from "./billing-environment";

export function isStripeConfigured(): boolean {
  return billingEnvironmentMatches();
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !billingEnvironmentMatches()) return null;
  return new Stripe(key);
}
