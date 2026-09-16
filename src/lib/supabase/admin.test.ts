import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase, createPublicSupabase, createReviewWriter } from "./admin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createAdminSupabase", () => {
  it("returns null without a service or secret key", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(createAdminSupabase()).toBeNull();
  });

  it("builds a client from SUPABASE_SERVICE_ROLE_KEY", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(createAdminSupabase()).not.toBeNull();
  });

  it("falls back to SUPABASE_SECRET_KEY", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret-key-test");
    expect(createAdminSupabase()).not.toBeNull();
  });
});

describe("createPublicSupabase", () => {
  it("always builds a client from the publishable key", () => {
    expect(createPublicSupabase()).not.toBeNull();
  });
});

describe("createReviewWriter", () => {
  it("returns the user client when admin is missing", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const userClient = { kind: "user" };
    expect(createReviewWriter(userClient as never)).toBe(userClient);
  });
});
