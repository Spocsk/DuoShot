import { isProPlan, remainingFreeExports } from "./plans";
import type { PlanId } from "./specs";

export type Entitlements = {
  plan: PlanId;
  source: "stripe" | "free" | "workspace";
  remainingFreeExports: number | null;
  canUse69: boolean;
  subscriptionStatus?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  hasBillingCustomer?: boolean;
};

export function planFromWorkspace(value: string | null | undefined): PlanId {
  return value === "indie" || value === "studio" ? value : "free";
}

export function mergePlanSources(stripePlan: PlanId, manualPlan: PlanId): PlanId {
  if (stripePlan === "studio" || manualPlan === "studio") return "studio";
  if (stripePlan === "indie" || manualPlan === "indie") return "indie";
  return "free";
}

export function entitlementsFromPlan(
  plan: PlanId,
  extra: Pick<Entitlements, "source"> & { freeExportsUsed?: number } &
    Partial<Pick<Entitlements, "subscriptionStatus" | "periodEnd" | "cancelAtPeriodEnd" | "hasBillingCustomer">>,
): Entitlements {
  return {
    plan,
    source: extra.source,
    remainingFreeExports: remainingFreeExports(extra.freeExportsUsed ?? 0, plan),
    canUse69: isProPlan(plan),
    subscriptionStatus: extra.subscriptionStatus ?? null,
    periodEnd: extra.periodEnd ?? null,
    cancelAtPeriodEnd: extra.cancelAtPeriodEnd ?? false,
    hasBillingCustomer: extra.hasBillingCustomer ?? false,
  };
}

/** The signed webhook projection is authoritative; manual grants are explicit. */
export function resolveEntitlements(options: {
  workspacePlan?: string | null;
  manualPlan?: string | null;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  customerId?: string | null;
  freeExportsUsed?: number;
}): Entitlements {
  const stripePlan = options.subscriptionId && ["active", "trialing"].includes(options.subscriptionStatus ?? "")
    ? planFromWorkspace(options.workspacePlan)
    : "free";
  const manualPlan = planFromWorkspace(options.manualPlan);
  const plan = mergePlanSources(stripePlan, manualPlan);
  return entitlementsFromPlan(plan, {
    source: manualPlan !== "free" && plan === manualPlan ? "workspace" : stripePlan !== "free" ? "stripe" : "free",
    freeExportsUsed: options.freeExportsUsed,
    subscriptionStatus: options.subscriptionStatus,
    periodEnd: options.periodEnd,
    cancelAtPeriodEnd: options.cancelAtPeriodEnd ?? false,
    hasBillingCustomer: Boolean(options.customerId),
  });
}
