import type { PlanId } from "./specs";

export type CheckoutKind = "indie_monthly" | "studio_monthly" | "indie_yearly" | "studio_yearly";
/** One-time purchases (Stripe Checkout mode "payment"); kept apart from subscriptions. */
export type OneTimeKind = "pass30";
export type PurchaseKind = CheckoutKind | OneTimeKind;

export const FREE_EXPORTS = 2;
export const PRO_CHECKOUT_KIND: CheckoutKind = "indie_monthly";
export const PRO_DAILY_CAP = 100;
/** Studio seat count; the database mirrors it in private.seat_limit. */
export const STUDIO_SEATS = 3;
export const PLANS = {
  free: {
    id: "free" as const,
    freeExports: FREE_EXPORTS,
    duoOnly: true,
    seats: 1,
  },
  indie: {
    id: "indie" as const,
    dailyHdSets: PRO_DAILY_CAP,
    duoOnly: false,
    seats: 1,
    monthlyEur: 12,
    yearlyEur: 120,
  },
  studio: {
    id: "studio" as const,
    dailyHdSets: PRO_DAILY_CAP,
    duoOnly: false,
    seats: STUDIO_SEATS,
    monthlyEur: 49,
    yearlyEur: 490,
  },
};

/**
 * "Pass 30 jours": Indie quotas for a fixed period, paid once. The display price is
 * configuration, read everywhere from here; the Stripe price (STRIPE_PRICE_PASS30)
 * must match it. Hidden entirely when that price is not configured.
 */
export const PASS30 = {
  kind: "pass30" as const,
  name: "DuoShot Pass 30 jours",
  plan: "indie" as const,
  days: 30,
  priceEur: 19,
  mode: "payment" as const,
};

export const ONE_TIME_CATALOG: Record<OneTimeKind, typeof PASS30 & { amountCents: number }> = {
  pass30: { ...PASS30, amountCents: PASS30.priceEur * 100 },
};

export function isOneTimeKind(value: unknown): value is OneTimeKind {
  return value === "pass30";
}

export function pass30PriceId(): string | undefined {
  return process.env.STRIPE_PRICE_PASS30 || undefined;
}

export const CHECKOUT_CATALOG: Record<
  CheckoutKind,
  {
    name: string;
    amountCents: number;
    mode: "subscription";
    plan?: PlanId;
  }
> = {
  indie_monthly: {
    name: "DuoShot Indie",
    amountCents: 1200,
    mode: "subscription",
    plan: "indie",
  },
  studio_monthly: {
    name: "DuoShot Studio",
    amountCents: 4900,
    mode: "subscription",
    plan: "studio",
  },
  indie_yearly: {
    name: "DuoShot Indie · yearly",
    amountCents: 12000,
    mode: "subscription",
    plan: "indie",
  },
  studio_yearly: {
    name: "DuoShot Studio · yearly",
    amountCents: 49000,
    mode: "subscription",
    plan: "studio",
  },
};

export function isProPlan(plan: PlanId): boolean {
  return plan === "indie" || plan === "studio";
}

export function remainingFreeExports(used: number, plan: PlanId): number | null {
  if (isProPlan(plan)) return null;
  return Math.max(0, FREE_EXPORTS - used);
}

export function dailyLimitFor(plan: PlanId): number {
  return isProPlan(plan) ? PRO_DAILY_CAP : FREE_EXPORTS;
}

export function formatEurFromCents(cents: number, locale: "fr" | "en"): string {
  const value = cents / 100;
  return locale === "fr" ? `${value} €` : `€${value}`;
}
