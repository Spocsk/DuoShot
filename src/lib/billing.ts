import { isLaunchGrantActive, isProPlan, remainingFreeExports, type CheckoutKind } from "./plans";
import type { PlanId } from "./specs";
import { getStripe } from "./stripe";

export type Entitlements = {
  plan: PlanId;
  source: "stripe" | "free" | "mock" | "workspace";
  remainingFreeExports: number | null;
  canUse69: boolean;
  launchExpiresAt: string | null;
};

export function planFromWorkspace(
  value: string | null | undefined,
  extra?: {
    subscriptionStatus?: string | null;
    launchOfferUntil?: string | null;
    now?: number;
  },
): PlanId {
  const now = extra?.now ?? Date.now();
  if (value === "studio") return "studio";
  if (isLaunchGrantActive(extra?.subscriptionStatus, extra?.launchOfferUntil, now)) {
    return "indie";
  }
  if (extra?.subscriptionStatus === "launch") return "free";
  if (value === "indie") return "indie";
  return "free";
}

export function mergePlanSources(stripePlan: PlanId, workspacePlan: PlanId): PlanId {
  if (stripePlan === "studio" || workspacePlan === "studio") return "studio";
  if (stripePlan === "indie" || workspacePlan === "indie") return "indie";
  return "free";
}

export function entitlementsFromPlan(
  plan: PlanId,
  extra: Pick<Entitlements, "source"> & {
    freeExportsUsed?: number;
    launchExpiresAt?: string | null;
  },
): Entitlements {
  return {
    plan,
    source: extra.source,
    remainingFreeExports: remainingFreeExports(extra.freeExportsUsed ?? 0, plan),
    canUse69: isProPlan(plan),
    launchExpiresAt: extra.launchExpiresAt ?? null,
  };
}

export async function resolveEntitlements(options: {
  email: string | null | undefined;
  workspaceId: string;
  freeExportsUsed?: number;
  workspacePlan?: string | null;
  launchOfferUntil?: string | null;
  subscriptionStatus?: string | null;
  now?: number;
}): Promise<Entitlements> {
  const stripe = getStripe();
  const used = options.freeExportsUsed ?? 0;
  const now = options.now ?? Date.now();
  const launchActive = isLaunchGrantActive(options.subscriptionStatus, options.launchOfferUntil, now);
  const workspacePlan = planFromWorkspace(options.workspacePlan, {
    subscriptionStatus: options.subscriptionStatus,
    launchOfferUntil: options.launchOfferUntil,
    now,
  });
  const launchExpiresAt = launchActive ? (options.launchOfferUntil ?? null) : null;
  if (!stripe || !options.email) {
    return entitlementsFromPlan(workspacePlan, {
      source: workspacePlan === "free" ? (stripe ? "free" : "mock") : "workspace",
      freeExportsUsed: used,
      launchExpiresAt,
    });
  }

  const customers = await stripe.customers.list({ email: options.email, limit: 10 });
  const matched = customers.data.filter(
    (customer) => customer.metadata.workspace_id === options.workspaceId || !customer.metadata.workspace_id,
  );
  if (matched.length === 0) {
    return entitlementsFromPlan(workspacePlan, {
      source: workspacePlan === "free" ? "stripe" : "workspace",
      freeExportsUsed: used,
      launchExpiresAt,
    });
  }

  let plan: PlanId = "free";
  for (const customer of matched) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    for (const subscription of subscriptions.data) {
      if (!["active", "trialing"].includes(subscription.status)) continue;
      const kind = subscription.metadata.kind as CheckoutKind | undefined;
      if (kind === "studio_monthly") plan = "studio";
      else if (plan !== "studio") plan = "indie";
    }
  }

  const resolved = mergePlanSources(plan, workspacePlan);
  return entitlementsFromPlan(resolved, {
    source: resolved === plan ? "stripe" : "workspace",
    freeExportsUsed: used,
    launchExpiresAt: resolved === "indie" ? launchExpiresAt : null,
  });
}
