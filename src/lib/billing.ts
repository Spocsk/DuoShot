import { CHECKOUT_CATALOG, isProPlan, remainingFreeExports, type CheckoutKind } from "./plans";
import type { PlanId } from "./specs";
import { getStripe } from "./stripe";

export type Entitlements = {
  plan: PlanId;
  extraAppPacks: number;
  launchUntil: string | null;
  source: "stripe" | "free" | "mock";
  remainingFreeExports: number | null;
  canUse69: boolean;
};

export function entitlementsFromPlan(
  plan: PlanId,
  extra: Pick<Entitlements, "extraAppPacks" | "launchUntil" | "source"> & {
    freeExportsUsed?: number;
  },
): Entitlements {
  return {
    plan,
    extraAppPacks: extra.extraAppPacks,
    launchUntil: extra.launchUntil,
    source: extra.source,
    remainingFreeExports: remainingFreeExports(extra.freeExportsUsed ?? 0, plan),
    canUse69: isProPlan(plan),
  };
}

export async function resolveEntitlements(options: {
  email: string | null | undefined;
  workspaceId: string;
  freeExportsUsed?: number;
}): Promise<Entitlements> {
  const stripe = getStripe();
  const used = options.freeExportsUsed ?? 0;
  if (!stripe || !options.email) {
    return entitlementsFromPlan("free", {
      extraAppPacks: 0,
      launchUntil: null,
      source: stripe ? "free" : "mock",
      freeExportsUsed: used,
    });
  }

  const customers = await stripe.customers.list({ email: options.email, limit: 10 });
  const matched = customers.data.filter(
    (customer) => customer.metadata.workspace_id === options.workspaceId || !customer.metadata.workspace_id,
  );
  if (matched.length === 0) {
    return entitlementsFromPlan("free", {
      extraAppPacks: 0,
      launchUntil: null,
      source: "stripe",
      freeExportsUsed: used,
    });
  }

  let plan: PlanId = "free";
  let extraAppPacks = 0;
  let launchUntil: string | null = null;

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

    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      limit: 30,
    });
    for (const session of sessions.data) {
      if (session.payment_status !== "paid" && session.status !== "complete") continue;
      const kind = session.metadata?.kind as CheckoutKind | undefined;
      if (!kind) continue;
      const catalog = CHECKOUT_CATALOG[kind];
      if (catalog?.appPack) extraAppPacks += 1;
      if (catalog?.launchDays && catalog.plan) {
        const paidAt = session.created * 1000;
        const until = new Date(paidAt + catalog.launchDays * 24 * 60 * 60 * 1000);
        if (until.getTime() > Date.now() && plan === "free") {
          plan = catalog.plan;
          launchUntil = until.toISOString();
        }
      }
    }
  }

  return entitlementsFromPlan(plan, {
    extraAppPacks,
    launchUntil,
    source: "stripe",
    freeExportsUsed: used,
  });
}
