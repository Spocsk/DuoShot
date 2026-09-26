import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseUrl } from "./env";
import { getSupabaseAuthCookieName, getSupabaseServerUrl, publicSupabaseUrl } from "./server-env";

afterEach(() => vi.unstubAllEnvs());

describe("self-hosted Supabase routing", () => {
  it("keeps browser traffic and auth cookies on the public identity while SSR uses Docker", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://api.duoshot.site");
    vi.stubEnv("SUPABASE_INTERNAL_URL", "http://api-gw:8000");
    expect(getSupabaseUrl()).toBe("https://api.duoshot.site");
    expect(getSupabaseServerUrl()).toBe("http://api-gw:8000");
    expect(getSupabaseAuthCookieName()).toBe("sb-api-auth-token");
  });

  it("preserves the managed Supabase cookie identity before cutover", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example-project.supabase.co");
    vi.stubEnv("SUPABASE_INTERNAL_URL", "");
    expect(getSupabaseServerUrl()).toBe(getSupabaseUrl());
    expect(getSupabaseAuthCookieName()).toBe("sb-example-project-auth-token");
  });

  it("returns signed downloads on the public origin without changing the signature", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://api.duoshot.site");
    vi.stubEnv("SUPABASE_INTERNAL_URL", "http://api-gw:8000");
    expect(publicSupabaseUrl("http://api-gw:8000/storage/v1/object/sign/exports/a.zip?token=a.b-c&download=app.zip"))
      .toBe("https://api.duoshot.site/storage/v1/object/sign/exports/a.zip?token=a.b-c&download=app.zip");
    expect(publicSupabaseUrl("https://another.example/file.zip"))
      .toBe("https://another.example/file.zip");
  });
});
