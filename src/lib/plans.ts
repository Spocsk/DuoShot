import type { PlanId } from "./specs";

export type CheckoutKind = "indie_monthly" | "indie_launch" | "studio_monthly" | "app_pack";

export const FREE_EXPORTS = 2;
export const PRO_CHECKOUT_KIND: CheckoutKind = "indie_monthly";
export const PRO_DAILY_CAP = 100;

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
    launchEur: 29,
    launchDays: 60,
  },
  studio: {
    id: "studio" as const,
    dailyHdSets: PRO_DAILY_CAP,
    duoOnly: false,
    seats: 3,
    monthlyEur: 49,
  },
  appPack: {
    eur: 19,
  },
};

export const CHECKOUT_CATALOG: Record<
  CheckoutKind,
  {
    name: string;
    amountCents: number;
    mode: "subscription" | "payment";
    plan?: PlanId;
    launchDays?: number;
    appPack?: boolean;
  }
> = {
  indie_monthly: {
    name: "DuoShot Indie",
    amountCents: 1200,
    mode: "subscription",
    plan: "indie",
  },
  indie_launch: {
    name: "DuoShot Indie — lancement 60 j",
    amountCents: 2900,
    mode: "payment",
    plan: "indie",
    launchDays: 60,
  },
  studio_monthly: {
    name: "DuoShot Studio",
    amountCents: 4900,
    mode: "subscription",
    plan: "studio",
  },
  app_pack: {
    name: "DuoShot — pack app",
    amountCents: 1900,
    mode: "payment",
    appPack: true,
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
