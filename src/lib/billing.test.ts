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

  it("grants Indie while a one-time pass is unexpired, checked at read time", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const pass = resolveEntitlements({ workspacePlan: "free", passExpiresAt: "2026-11-19T12:00:00Z", now });
    expect(pass.plan).toBe("indie");
    expect(pass.source).toBe("stripe");
    expect(pass.canUse69).toBe(true);
    expect(pass.remainingFreeExports).toBeNull();
    expect(pass.passExpiresAt).toBe("2026-11-19T12:00:00Z");
    const expired = resolveEntitlements({ workspacePlan: "free", passExpiresAt: "2026-10-20T11:59:59Z", now, freeExportsUsed: 2 });
    expect(expired.plan).toBe("free");
    expect(expired.passExpiresAt).toBeNull();
    expect(expired.remainingFreeExports).toBe(0);
  });

  it("never lets a pass downgrade a Studio subscription or manual grant", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    const passExpiresAt = "2026-11-19T12:00:00Z";
    expect(resolveEntitlements({ workspacePlan: "studio", subscriptionId: "sub_1", subscriptionStatus: "active", passExpiresAt, now }).plan).toBe("studio");
    expect(resolveEntitlements({ manualPlan: "studio", passExpiresAt, now }).plan).toBe("studio");
  });
});
