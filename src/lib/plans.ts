import type { PlanId } from "./specs";

export type CheckoutKind = "indie_monthly" | "indie_launch" | "studio_monthly" | "app_pack";

export const PLANS = {
  free: {
    id: "free" as const,
    dailyHdSets: 1,
    duoOnly: true,
    seats: 1,
  },
  indie: {
    id: "indie" as const,
    dailyHdSets: 100,
    duoOnly: false,
    seats: 1,
    monthlyEur: 12,
    launchEur: 29,
    launchDays: 60,
  },
  studio: {
    id: "studio" as const,
    dailyHdSets: 100,
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

export function dailyLimitFor(plan: PlanId): number {
  return plan === "free" ? PLANS.free.dailyHdSets : 100;
}
