import { describe, expect, it } from "vitest";
import { entitlementsFromPlan, resolveEntitlements } from "./billing";

describe("billing entitlement projection", () => {
  it("counts the free allowance", () => {
    expect(entitlementsFromPlan("free", { source: "free", freeExportsUsed: 1 }).remainingFreeExports).toBe(1);
  });

  it("grants access only for a linked active subscription", () => {
    const active = resolveEntitlements({ workspacePlan: "studio", subscriptionId: "sub_1", subscriptionStatus: "active" });
    expect(active.plan).toBe("studio");
    expect(active.source).toBe("stripe");
    const canceled = resolveEntitlements({ workspacePlan: "studio", subscriptionId: "sub_1", subscriptionStatus: "canceled" });
    expect(canceled.plan).toBe("free");
    expect(canceled.canUse69).toBe(false);
  });

  it("keeps an explicit manual grant independent of Stripe", () => {
    const grant = resolveEntitlements({ workspacePlan: "free", manualPlan: "indie", subscriptionStatus: "canceled" });
    expect(grant.plan).toBe("indie");
    expect(grant.source).toBe("workspace");
  });
});
