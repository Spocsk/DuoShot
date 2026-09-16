import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "./admin";

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
