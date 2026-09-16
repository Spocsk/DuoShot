import { afterEach, describe, expect, it, vi } from "vitest";
import { getStripe, isStripeConfigured } from "./stripe";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("stripe", () => {
  it("stays unconfigured without a secret", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(isStripeConfigured()).toBe(false);
    expect(getStripe()).toBeNull();
  });

  it("builds a client when a secret is present", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_duoshot");
    expect(isStripeConfigured()).toBe(true);
    expect(getStripe()).not.toBeNull();
  });
});
