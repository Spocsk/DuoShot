import { describe, expect, it } from "vitest";
import { entitlementsFromPlan } from "./billing";

describe("billing", () => {
  it("keeps free plans gated and counted", () => {
    const free = entitlementsFromPlan("free", {
      extraAppPacks: 0,
      launchUntil: null,
      source: "free",
      freeExportsUsed: 1,
    });
    expect(free.plan).toBe("free");
    expect(free.canUse69).toBe(false);
    expect(free.remainingFreeExports).toBe(1);
  });

  it("unlocks 6.9-inch sizes for indie", () => {
    const indie = entitlementsFromPlan("indie", {
      extraAppPacks: 0,
      launchUntil: null,
      source: "stripe",
    });
    expect(indie.canUse69).toBe(true);
    expect(indie.remainingFreeExports).toBeNull();
  });
});
