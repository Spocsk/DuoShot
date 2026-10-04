import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutAvailable, checkoutDisplayAvailable, passCheckoutAvailable } from "./billing-availability";

const PRICE_IDS = [
  "STRIPE_INDIE_PRICE_ID",
  "STRIPE_INDIE_YEARLY_PRICE_ID",
  "STRIPE_STUDIO_PRICE_ID",
  "STRIPE_STUDIO_YEARLY_PRICE_ID",
] as const;

// VERCEL_ENV is deliberately never stubbed: these cases must hold with or without that clause.
function configureTest() {
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
}

function configureLive() {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");
}

beforeEach(() => {
  configureTest();
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
  vi.stubEnv("STRIPE_LIVE_ENABLED", "true");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  for (const key of PRICE_IDS) vi.stubEnv(key, `price_${key.toLowerCase()}`);
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("checkoutAvailable", () => {
  it("is available on a fully configured test deployment", () => {
    expect(checkoutAvailable()).toBe(true);
    expect(checkoutAvailable("any-user")).toBe(true);
  });

  it("is available on a fully configured live deployment", () => {
    configureLive();
    expect(checkoutAvailable()).toBe(true);
  });

  it("accepts a restricted live key in production", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_example");
    expect(checkoutAvailable()).toBe(true);
  });

  it("requires STRIPE_LIVE_ENABLED=true only for a live key", () => {
    vi.stubEnv("STRIPE_LIVE_ENABLED", "false");
    expect(checkoutAvailable()).toBe(true);
    configureLive();
    expect(checkoutAvailable()).toBe(false);
    vi.stubEnv("STRIPE_LIVE_ENABLED", "");
    expect(checkoutAvailable()).toBe(false);
    vi.stubEnv("STRIPE_LIVE_ENABLED", "TRUE");
    expect(checkoutAvailable()).toBe(false);
  });

  it("rejects a key whose mode does not match the deployment", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");
    expect(checkoutAvailable()).toBe(false);
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    expect(checkoutAvailable()).toBe(false);
  });

  it("is unavailable without a secret key or deployment identity", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(checkoutAvailable()).toBe(false);
    configureTest();
    vi.stubEnv("APP_ENV", "");
    expect(checkoutAvailable()).toBe(false);
  });

  it.each(["false", "", "1", "TRUE"])("requires STRIPE_CHECKOUT_ENABLED to be exactly 'true' (got %j)", (value) => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", value);
    expect(checkoutAvailable()).toBe(false);
  });

  it("requires the webhook secret", () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(checkoutAvailable()).toBe(false);
  });

  it("accepts either Supabase admin key and requires one of them", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");
    expect(checkoutAvailable()).toBe(true);
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(checkoutAvailable()).toBe(false);
  });

  it.each(PRICE_IDS)("requires %s", (key) => {
    vi.stubEnv(key, "");
    expect(checkoutAvailable()).toBe(false);
  });

  it("limits checkout to allowlisted users when BILLING_ALLOWED_USER_IDS is set", () => {
    vi.stubEnv("BILLING_ALLOWED_USER_IDS", "user-a, user-b");
    expect(checkoutAvailable()).toBe(false);
    expect(checkoutAvailable("user-c")).toBe(false);
    expect(checkoutAvailable("user-a")).toBe(true);
    expect(checkoutAvailable("user-b")).toBe(true);
  });

  it("treats an allowlist of only separators as empty", () => {
    vi.stubEnv("BILLING_ALLOWED_USER_IDS", " , ,");
    expect(checkoutAvailable()).toBe(true);
  });

  it("still requires every other condition for an allowlisted user", () => {
    vi.stubEnv("BILLING_ALLOWED_USER_IDS", "user-a");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(checkoutAvailable("user-a")).toBe(false);
  });
});

describe("passCheckoutAvailable", () => {
  it("stays hidden until STRIPE_PRICE_PASS30 is set", () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "");
    expect(passCheckoutAvailable()).toBe(false);
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    expect(passCheckoutAvailable()).toBe(true);
  });

  it("follows the subscription checkout gate", () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    expect(passCheckoutAvailable()).toBe(false);
  });
});

describe("checkoutDisplayAvailable", () => {
  it("follows checkoutAvailable without the e2e flag", () => {
    expect(checkoutDisplayAvailable()).toBe(true);
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    expect(checkoutDisplayAvailable()).toBe(false);
  });

  it("lets only a non-production e2e run show the buttons without Stripe", () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("E2E_CHECKOUT_DISPLAY", "true");
    expect(checkoutDisplayAvailable()).toBe(true);
    expect(checkoutAvailable()).toBe(false);
    vi.stubEnv("APP_ENV", "production");
    expect(checkoutDisplayAvailable()).toBe(false);
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");
    expect(checkoutDisplayAvailable()).toBe(false);
  });
});
