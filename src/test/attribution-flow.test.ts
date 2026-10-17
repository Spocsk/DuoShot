import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as confirm } from "@/app/auth/confirm/route";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { captureAttribution } from "@/lib/attribution-client";
import { readAttribution } from "@/lib/attribution";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, createSupabaseMock } from "./supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn(async () => NextResponse.next()) }));

const origin = "https://duoshot.site";
const user = { id: "user-1", email: "test@example.com" };
const kinds = ["pass30", "indie_monthly", "indie_yearly", "studio_monthly", "studio_yearly"];

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  vi.stubEnv("SUPABASE_SECRET_KEY", "example");
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", "");
  vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
  vi.stubEnv("STRIPE_INDIE_PRICE_ID", "price_indie");
  vi.stubEnv("STRIPE_INDIE_YEARLY_PRICE_ID", "price_indie_yearly");
  vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
  vi.stubEnv("STRIPE_STUDIO_YEARLY_PRICE_ID", "price_studio_yearly");
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe.each(["proxy", "browser"])("%s first-touch through email confirmation and checkout", (capture) => {
  it.each(kinds)("preserves the pricing landing attribution for %s", async (kind) => {
    const landing = `${origin}/en/pricing?utm_source=x&utm_medium=y&utm_campaign=z&utm_content=hero`;
    const referrer = "https://news.example/private?email=private@example.com";
    let cookie = "";
    if (capture === "proxy") {
      const response = await proxy(new NextRequest(landing, { headers: { referer: referrer } }));
      cookie = response.headers.get("set-cookie")!.split(";")[0];
    } else {
      vi.stubGlobal("window", { location: { href: landing }, navigator: { userAgent: "Mozilla/5.0" } });
      vi.stubGlobal("document", {
        referrer,
        get cookie() { return cookie; },
        set cookie(value: string) { cookie = value.split(";")[0]; },
      });
      captureAttribution();
    }
    const originalCookie = cookie;
    expect(readAttribution(cookie, "duoshot.site")).toEqual({
      utm_source: "x", utm_medium: "y", utm_campaign: "z", utm_content: "hero", referrer: "news.example",
    });

    // Pricing deliberately navigates without UTMs. Signup and a later campaign
    // must not replace the cookie or extend its lifetime.
    const next = `/en/tool?upgrade=1&plan=${kind}`;
    for (const path of [next, `/en/signup?next=${encodeURIComponent(next)}`, "/en/pricing?utm_source=second"]) {
      const response = await proxy(new NextRequest(`${origin}${path}`, {
        headers: { cookie, referer: `${origin}/en/pricing` },
      }));
      expect(response.cookies.has("ds_attr")).toBe(false);
      if (capture === "browser") {
        Object.assign(window.location, { href: `${origin}${path}` });
        captureAttribution();
        expect(cookie).toBe(originalCookie);
      }
    }

    const auth = createSupabaseMock({
      user,
      from: (table) => createQueryBuilder({ data: table === "workspace_members"
        ? { workspace_id: "ws-1", role: "owner" }
        : { stripe_customer_id: "cus_1", stripe_subscription_id: null }, error: null }),
    });
    const confirmed = vi.fn().mockResolvedValue({ data: { session: { user } }, error: null });
    vi.mocked(createServerSupabase).mockResolvedValue({
      ...auth, auth: { ...auth.auth, exchangeCodeForSession: confirmed, verifyOtp: confirmed },
    } as never);
    // Both the PKCE callback and token-hash email confirmation preserve the plan.
    for (const [handler, path, params] of [
      [callback, "callback", { code: "signup-code", next }],
      [confirm, "confirm", { token_hash: "signup-token", type: "signup", next }],
    ] as const) {
      const response = await handler(new Request(`${origin}/auth/${path}?${new URLSearchParams(params)}`, { headers: { cookie } }));
      expect(response.headers.get("location")).toBe(`${origin}${next}`);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    }

    const rpc = vi.fn(async (_name: string, args: unknown) => ({ data: {
      attempt_id: "attempt-1", kind: (args as { p_kind: string }).p_kind,
      return_path: "/en/tool", expires_at: new Date(Date.now() + 86400000).toISOString(),
    }, error: null }));
    vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc }) as never);
    const create = vi.fn().mockResolvedValue({ id: "cs_attr", url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    const response = await checkout(new Request(`${origin}/api/stripe/checkout`, {
      method: "POST", headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ kind, next: "/en/tool" }),
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("begin_checkout", {
      p_workspace_id: "ws-1", p_kind: kind, p_return_path: "/en/tool",
    });
    const metadata = { kind, workspace_id: "ws-1", utm_source: "x", utm_medium: "y", utm_campaign: "z", utm_content: "hero", referrer: "news.example" };
    const params = create.mock.calls[0][0];
    expect(params.metadata).toEqual(metadata);
    expect(params[kind === "pass30" ? "payment_intent_data" : "subscription_data"]).toEqual({ metadata });
    expect(params.success_url).toContain(`${origin}/en/tool?checkout=success`);
  });
});
