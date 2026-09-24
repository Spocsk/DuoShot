import { describe, expect, it } from "vitest";
import { CHECKOUT_CATALOG, FREE_EXPORTS, PLANS, dailyLimitFor, formatEurFromCents, isProPlan, remainingFreeExports } from "./plans";

describe("plans", () => {
  it("gives two lifetime free exports", () => {
    expect(FREE_EXPORTS).toBe(2);
    expect(remainingFreeExports(0, "free")).toBe(2);
    expect(remainingFreeExports(1, "free")).toBe(1);
    expect(remainingFreeExports(2, "free")).toBe(0);
    expect(remainingFreeExports(9, "free")).toBe(0);
    expect(remainingFreeExports(0, "indie")).toBeNull();
  });

  it("treats indie as Pro", () => {
    expect(isProPlan("indie")).toBe(true);
    expect(isProPlan("studio")).toBe(true);
    expect(isProPlan("free")).toBe(false);
    expect(dailyLimitFor("indie")).toBe(100);
  });

  it("includes three seats in Studio", () => {
    expect(PLANS.studio.seats).toBe(3);
  });

  it("offers two months free on annual subscriptions", () => {
    expect(CHECKOUT_CATALOG.indie_yearly.amountCents).toBe(10 * CHECKOUT_CATALOG.indie_monthly.amountCents);
    expect(CHECKOUT_CATALOG.studio_yearly.amountCents).toBe(10 * CHECKOUT_CATALOG.studio_monthly.amountCents);
  });

  it("formats euro amounts per locale", () => {
    expect(formatEurFromCents(1200, "fr")).toBe("12 €");
    expect(formatEurFromCents(1200, "en")).toBe("€12");
    expect(formatEurFromCents(4900, "fr")).toBe("49 €");
  });
});
