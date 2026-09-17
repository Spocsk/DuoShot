import type { PlanId } from "./specs";

export type CheckoutKind = "indie_monthly" | "indie_launch" | "studio_monthly";

export const FREE_EXPORTS = 2;
export const PRO_CHECKOUT_KIND: CheckoutKind = "indie_monthly";
export const PRO_DAILY_CAP = 100;
export const LAUNCH_AMOUNT_CENTS = 2900;
export const LAUNCH_DURATION_MS = 60 * 24 * 60 * 60 * 1000;
/** End of 23 Oct 2026 in Paris (CEST). After this, hide Launch and recommend Indie. */
export const LAUNCH_SALE_UNTIL_MS = Date.parse("2026-10-23T21:59:59.999Z");

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
  },
  studio: {
    id: "studio" as const,
    dailyHdSets: PRO_DAILY_CAP,
    duoOnly: false,
    seats: 3,
    monthlyEur: 49,
  },
};

export const CHECKOUT_CATALOG: Record<
  CheckoutKind,
  {
    name: string;
    amountCents: number;
    mode: "subscription" | "payment";
    plan?: PlanId;
  }
> = {
  indie_monthly: {
    name: "DuoShot Indie",
    amountCents: 1200,
    mode: "subscription",
    plan: "indie",
  },
  indie_launch: {
    name: "DuoShot Launch",
    amountCents: LAUNCH_AMOUNT_CENTS,
    mode: "payment",
    plan: "indie",
  },
  studio_monthly: {
    name: "DuoShot Studio",
    amountCents: 4900,
    mode: "subscription",
    plan: "studio",
  },
};

export function isLaunchSaleOpen(now = Date.now()): boolean {
  return now <= LAUNCH_SALE_UNTIL_MS;
}

export function launchExpiresAt(now = Date.now()): string {
  return new Date(now + LAUNCH_DURATION_MS).toISOString();
}

export function isLaunchGrantActive(
  subscriptionStatus: string | null | undefined,
  launchOfferUntil: string | null | undefined,
  now = Date.now(),
): boolean {
  if (subscriptionStatus !== "launch") return false;
  if (!launchOfferUntil) return false;
  return new Date(launchOfferUntil).getTime() > now;
}

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
