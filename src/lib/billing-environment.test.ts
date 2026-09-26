import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingEnvironmentMatches, billingEventMatches, billingUserAllowed } from "./billing-environment";
import { checkoutAvailable } from "./billing-availability";

beforeEach(() => {
  for (const key of ["STRIPE_INDIE_PRICE_ID", "STRIPE_STUDIO_PRICE_ID", "STRIPE_INDIE_YEARLY_PRICE_ID", "STRIPE_STUDIO_YEARLY_PRICE_ID", "STRIPE_WEBHOOK_SECRET", "SUPABASE_SECRET_KEY"]) vi.stubEnv(key, "configured");
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true"); vi.stubEnv("STRIPE_LIVE_ENABLED", "true");
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", ""); vi.stubEnv("VERCEL_ENV", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("explicit billing environment", () => {
  it.each([
    ["", "sk_live_example", false], ["staging", "sk_test_example", false],
    ["production", "sk_test_example", false], ["production", "rk_test_example", false],
    ["production", "rk_live_example", true], ["production", "sk_live_example", true],
    ["test", "rk_test_example", true], ["development", "sk_test_example", true],
    ["test", "sk_live_example", false], ["production", "garbage", false],
  ])("%s with %s is permitted: %s", (env, key, allowed) => {
    vi.stubEnv("APP_ENV", env); vi.stubEnv("STRIPE_SECRET_KEY", key);
    expect(billingEnvironmentMatches()).toBe(allowed); expect(checkoutAvailable()).toBe(allowed);
  });
  it("keeps the production live switch and rejects mismatched webhook modes", () => {
    vi.stubEnv("APP_ENV", "production"); vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_example");
    vi.stubEnv("STRIPE_LIVE_ENABLED", "false");
    expect(checkoutAvailable()).toBe(false);
    expect(billingEventMatches(true)).toBe(true); // Already-paying customers still need webhook updates.
    expect(billingEventMatches(false)).toBe(false);
  });
  it("restricts checkout rehearsal to exact user IDs and hides public availability", () => {
    vi.stubEnv("APP_ENV", "production"); vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_example");
    vi.stubEnv("BILLING_ALLOWED_USER_IDS", " owner-a, owner-b ");
    expect(checkoutAvailable()).toBe(false); expect(checkoutAvailable("other")).toBe(false);
    expect(checkoutAvailable("owner-a")).toBe(true); expect(billingUserAllowed("owner")).toBe(false);
  });
  it("rejects a test deployment label on Vercel production", () => {
    vi.stubEnv("APP_ENV", "test"); vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_example"); vi.stubEnv("VERCEL_ENV", "production");
    expect(checkoutAvailable()).toBe(false);
  });
});
