import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieAdapter = { setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void };
const auth = { getClaims: vi.fn(), getUser: vi.fn() };
let adapter: CookieAdapter | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: CookieAdapter }) => {
    adapter = options.cookies;
    return { auth };
  }),
}));

const { updateSession } = await import("./proxy");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://api.duoshot.site");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  auth.getClaims.mockReset();
  auth.getUser.mockReset();
  adapter = undefined;
});
afterEach(() => vi.unstubAllEnvs());

describe("updateSession", () => {
  it("refreshes through getClaims, never a getUser round-trip, and forwards rotated cookies", async () => {
    auth.getClaims.mockImplementation(async () => {
      adapter!.setAll([{ name: "sb-api-auth-token", value: "rotated", options: { path: "/" } }]);
      return { data: { claims: { sub: "user-1" } }, error: null };
    });
    const response = await updateSession(new NextRequest("https://duoshot.site/tool"));
    expect(auth.getClaims).toHaveBeenCalledTimes(1);
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(response.cookies.get("sb-api-auth-token")?.value).toBe("rotated");
  });

  it("passes through without Supabase configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await updateSession(new NextRequest("https://duoshot.site/tool"));
    expect(auth.getClaims).not.toHaveBeenCalled();
  });
});
