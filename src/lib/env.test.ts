import { afterEach, describe, expect, it, vi } from "vitest";
import { deploymentProblems, startupProblems } from "../../scripts/lib/env-rules.mjs";
import { assertServerEnv, EnvConfigError } from "./env-check";
import { publicEnv, serverEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const KEY = Buffer.alloc(32, 1).toString("base64");
const SECRET = "c".repeat(32);
const production = {
  APP_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://duoshot.site", NEXT_PUBLIC_SUPABASE_URL: "https://api.duoshot.site",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x", SUPABASE_SECRET_KEY: "sb_secret_x", CRON_SECRET: SECRET,
};

describe("serverEnv", () => {
  it("reads on access, treats empty strings as unset and parses flags and lists", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
    vi.stubEnv("RENDER_QUEUE_ENABLED", "true");
    vi.stubEnv("BILLING_ALLOWED_USER_IDS", " a, ,b ");
    vi.stubEnv("RENDER_CONCURRENCY", "3");
    expect(serverEnv.supabase.adminKey).toBe("secret");
    expect(serverEnv.render.queueEnabled).toBe(true);
    expect(serverEnv.billing.allowedUserIds).toEqual(["a", "b"]);
    expect(serverEnv.render.concurrency).toBe(1);
    vi.stubEnv("RENDER_QUEUE_ENABLED", "1");
    expect(serverEnv.render.queueEnabled).toBe(false);
  });

  it("only accepts known APP_ENV values and trims the public site URL", () => {
    vi.stubEnv("APP_ENV", "staging");
    expect(serverEnv.appEnv).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site/");
    expect(publicEnv.siteUrl).toBe("https://duoshot.site");
  });
});

describe("startup rules", () => {
  it("accepts an empty local environment and a complete production one", () => {
    expect(startupProblems({})).toEqual([]);
    expect(startupProblems(production)).toEqual([]);
  });

  it("names missing production basics and enabled features without their configuration", () => {
    expect(startupProblems({ APP_ENV: "production" })).toEqual([
      "NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PUBLIC_KEY", "SUPABASE_ADMIN_KEY", "CRON_SECRET",
    ]);
    expect(startupProblems({ STRIPE_CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_x" })).toContain(
      "STRIPE_WEBHOOK_SECRET (required by STRIPE_CHECKOUT_ENABLED)",
    );
    expect(startupProblems({ ASC_CONNECTOR_ENABLED: "true", ASC_ENCRYPTION_KEY: "short" })).toEqual([
      "ASC_ENCRYPTION_KEY (32 bytes base64, required by ASC_CONNECTOR_ENABLED)",
      "RENDER_QUEUE_ENABLED (App Store Connect uploads run on the queue)",
    ]);
    expect(startupProblems({ APP_ENV: "staging", RENDER_WORKER_MODE: "cron", ASC_JOB_TIMEOUT_MS: "60000" })).toEqual([
      "APP_ENV (production, test, development)", "RENDER_WORKER_MODE (process or http)", "ASC_JOB_TIMEOUT_MS (660000 or more)",
    ]);
  });

  it("leaves the production web basics to the web server", () => {
    expect(startupProblems({ APP_ENV: "production" }, "worker")).toEqual([]);
  });

  it("is never stricter than the VPS audit for a production environment", () => {
    const env = { ...production, RENDER_QUEUE_ENABLED: "true", RENDER_WORKER_SECRET: "d".repeat(32), ASC_CONNECTOR_ENABLED: "true", ASC_ENCRYPTION_KEY: KEY };
    expect(deploymentProblems(env)).toEqual([]);
    expect(startupProblems(env)).toEqual([]);
  });
});

describe("assertServerEnv", () => {
  it("throws in production builds and only warns in development", () => {
    const broken = { ASC_CONNECTOR_ENABLED: "true" };
    expect(() => assertServerEnv("web", { ...broken, NODE_ENV: "production" })).toThrow(EnvConfigError);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertServerEnv("web", { ...broken, NODE_ENV: "development" })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ASC_ENCRYPTION_KEY"));
  });

  it("never prints values", () => {
    try {
      assertServerEnv("web", { NODE_ENV: "production", ASC_CONNECTOR_ENABLED: "true", ASC_ENCRYPTION_KEY: "leaky-value" });
    } catch (error) {
      expect(String(error)).not.toContain("leaky-value");
      return;
    }
    throw new Error("expected a configuration error");
  });
});
