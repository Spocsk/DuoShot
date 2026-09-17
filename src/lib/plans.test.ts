import { describe, expect, it } from "vitest";
import { FREE_EXPORTS, LAUNCH_AMOUNT_CENTS, LAUNCH_DURATION_MS, PLANS, dailyLimitFor, formatEurFromCents, isLaunchGrantActive, isLaunchSaleOpen, isProPlan, launchExpiresAt, remainingFreeExports } from "./plans";

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

  it("formats euro amounts per locale", () => {
    expect(formatEurFromCents(1200, "fr")).toBe("12 €");
    expect(formatEurFromCents(1200, "en")).toBe("€12");
    expect(formatEurFromCents(4900, "fr")).toBe("49 €");
    expect(formatEurFromCents(LAUNCH_AMOUNT_CENTS, "fr")).toBe("29 €");
  });

  it("keeps the Launch sale open through 23 Oct 2026", () => {
    expect(isLaunchSaleOpen(Date.parse("2026-10-23T21:59:59.000Z"))).toBe(true);
    expect(isLaunchSaleOpen(Date.parse("2026-10-24T00:00:00.000Z"))).toBe(false);
  });

  it("grants 60 days of Indie from a Launch payment", () => {
    const now = Date.parse("2026-09-17T12:00:00.000Z");
    expect(launchExpiresAt(now)).toBe(new Date(now + LAUNCH_DURATION_MS).toISOString());
    expect(isLaunchGrantActive("launch", new Date(now + 1).toISOString(), now)).toBe(true);
    expect(isLaunchGrantActive("launch", new Date(now - 1).toISOString(), now)).toBe(false);
    expect(isLaunchGrantActive("active", new Date(now + 1).toISOString(), now)).toBe(false);
  });
});
