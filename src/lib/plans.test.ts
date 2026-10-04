import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHECKOUT_CATALOG, FREE_EXPORTS, ONE_TIME_CATALOG, PASS30, isOneTimeKind, PLANS, STUDIO_SEATS, dailyLimitFor, formatEurFromCents, isProPlan, remainingFreeExports } from "./plans";

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
    expect(STUDIO_SEATS).toBe(PLANS.studio.seats);
  });

  it("offers two months free on annual subscriptions", () => {
    expect(CHECKOUT_CATALOG.indie_yearly.amountCents).toBe(10 * CHECKOUT_CATALOG.indie_monthly.amountCents);
    expect(CHECKOUT_CATALOG.studio_yearly.amountCents).toBe(10 * CHECKOUT_CATALOG.studio_monthly.amountCents);
  });

  it("derives the one-time pass amount from a single configured price", () => {
    expect(PASS30.priceEur).toBe(19);
    expect(ONE_TIME_CATALOG.pass30.amountCents).toBe(PASS30.priceEur * 100);
    expect(ONE_TIME_CATALOG.pass30.mode).toBe("payment");
    expect(PASS30.days).toBe(30);
    expect(isOneTimeKind("pass30")).toBe(true);
    expect(isOneTimeKind("indie_monthly")).toBe(false);
    expect(Object.keys(CHECKOUT_CATALOG)).not.toContain("pass30");
  });

  it("formats euro amounts per locale", () => {
    expect(formatEurFromCents(1200, "fr")).toBe("12 €");
    expect(formatEurFromCents(1200, "en")).toBe("€12");
    expect(formatEurFromCents(4900, "fr")).toBe("49 €");
  });
});

describe("seat limit", () => {
  it("matches the latest private.seat_limit definition in the migrations", () => {
    const definitions = readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).sort()
      .flatMap((file) => readFileSync(`supabase/migrations/${file}`, "utf8").match(/private\.seat_limit\(p_plan text\)[\s\S]*?when p_plan = 'studio' then (\d+)/g) ?? []);
    const latest = definitions.at(-1)?.match(/then (\d+)$/)?.[1];
    expect(Number(latest)).toBe(STUDIO_SEATS);
  });
});
