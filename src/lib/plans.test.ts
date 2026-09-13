import { describe, expect, it } from "vitest";
import { FREE_EXPORTS, dailyLimitFor, isProPlan, remainingFreeExports } from "./plans";

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
});
