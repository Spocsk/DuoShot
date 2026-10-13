import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/site", () => ({ getSiteUrl: () => "https://duoshot.example" }));

const user = { id: "user-1", email: "a@example.com" };
const request = (kind: string, cookie?: string) => new Request("http://localhost/api/stripe/checkout", {
  method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ kind, next: "/tool" }),
});

const attemptRpc = async (_name: string, args: unknown) => ({ data: { attempt_id: "attempt-1", kind: (args as {p_kind:string}).p_kind, return_path: "/tool", expires_at: new Date(Date.now()+86400000).toISOString() }, error: null });
function workspace(stripeSubscriptionId: string | null = null) {
  return createSupabaseMock({
    user,
    from: (table) => createQueryBuilder({ data: table === "workspace_members"
      ? { workspace_id: "ws-1", role: "owner" }
      : { stripe_customer_id: "cus_1", stripe_subscription_id: stripeSubscriptionId }, error: null }),
  }) as never;
}

function workspaceWithoutCustomer() {
  return createSupabaseMock({
    user,
    from: (table) => createQueryBuilder({ data: table === "workspace_members"
      ? { workspace_id: "ws-1", role: "owner" }
      : { stripe_customer_id: null, stripe_subscription_id: null }, error: null }),
  }) as never;
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(getStripe).mockReset();
  vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc: attemptRpc }) as never);
  vi.stubEnv("STRIPE_INDIE_PRICE_ID", "price_indie");
  vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
  vi.stubEnv("STRIPE_INDIE_YEARLY_PRICE_ID", "price_indie_yearly");
  vi.stubEnv("STRIPE_STUDIO_YEARLY_PRICE_ID", "price_studio_yearly");
  vi.stubEnv("STRIPE_TAX_ENABLED", "false");
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  vi.stubEnv("SUPABASE_SECRET_KEY", "example");
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/stripe/checkout", () => {
  it.each(["indie_monthly", "pass30"])("propagates sanitized first-touch metadata to the session and payment/subscription for %s", async (kind) => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    const create = vi.fn().mockResolvedValue({ id: "cs_attr", url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    const cookie = `ds_attr=${encodeURIComponent(JSON.stringify({
      utm_source: "Google!", utm_medium: "CPC", utm_campaign: "A".repeat(90), utm_content: "Hero_1", referrer: "NEWS.EXAMPLE",
      kind: "forged", workspace_id: "forged", email: "a@example.com",
    }))}`;
    expect((await POST(request(kind, cookie))).status).toBe(200);
    const metadata = { kind, workspace_id: "ws-1", utm_source: "google", utm_medium: "cpc", utm_campaign: "a".repeat(64), utm_content: "hero_1", referrer: "news.example" };
    const params = create.mock.calls[0][0];
    expect(params.metadata).toEqual(metadata);
    expect(params[kind === "pass30" ? "payment_intent_data" : "subscription_data"]).toEqual({ metadata });
    expect(params.allow_promotion_codes).toBe(true);
    expect(params.client_reference_id).toBe("ws-1");
  });

  it.each(["indie_monthly", "pass30"])("varies retry idempotency keys only when sanitized attribution changes for %s", async (kind) => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    const create = vi.fn().mockResolvedValue({ id: "cs_retry", url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    // The RPC keeps returning the same attempt without a saved session, as after a lost response.
    const attributions = [
      { utm_source: "google", utm_medium: "cpc" },
      { utm_medium: "CPC", utm_source: "Google!", ignored: "value" },
      { utm_source: "google", utm_medium: "organic" },
      {},
    ];
    for (const attribution of attributions) {
      const cookie = `ds_attr=${encodeURIComponent(JSON.stringify(attribution))}`;
      expect((await POST(request(kind, cookie))).status).toBe(200);
    }
    const keys = create.mock.calls.map(([, options]) => options.idempotencyKey);
    expect(keys[0]).toMatch(/^duoshot-checkout-attempt-1-[a-f0-9]{12}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toMatch(/^duoshot-checkout-attempt-1-[a-f0-9]{12}$/);
    expect(keys[2]).not.toBe(keys[0]);
    expect(keys[3]).toBe("duoshot-checkout-attempt-1");
  });

  it.each([undefined, "ds_attr=%E0%A4%A", "ds_attr={broken", "ds_attr=null", "ds_attr=%5B%5D"])("keeps checkout working without usable attribution (%s)", async (cookie) => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn().mockResolvedValue({ id: "cs_no_attr", url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    expect((await POST(request("indie_monthly", cookie))).status).toBe(200);
    expect(create.mock.calls[0][0].metadata).toEqual({ kind: "indie_monthly", workspace_id: "ws-1" });
    expect(create.mock.calls[0][0].subscription_data.metadata).toEqual({ kind: "indie_monthly", workspace_id: "ws-1" });
    expect(create.mock.calls[0][1]).toEqual({ idempotencyKey: "duoshot-checkout-attempt-1" });
  });

  it("requires a session and a known plan", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await POST(request("indie_monthly"))).status).toBe(401);
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    expect((await POST(request("unknown"))).status).toBe(400);
  });

  it("does not offer a mock checkout when billing is unconfigured", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.mocked(getStripe).mockReturnValue(null);
    const { status, body } = await readJson(await POST(request("indie_monthly")));
    expect(status).toBe(503);
    expect(body.error).toBe("BILLING_UNCONFIGURED");
  });

  it("rejects a test key on the production VPS before any Stripe operation", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.stubEnv("APP_ENV", "production");
    expect((await POST(request("indie_monthly"))).status).toBe(503);
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("enforces the rehearsal allowlist server-side", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.stubEnv("BILLING_ALLOWED_USER_IDS", "another-user");
    expect((await POST(request("indie_monthly"))).status).toBe(503);
    expect(getStripe).not.toHaveBeenCalled();
  });

  it.each([
    ["indie_monthly", "price_indie"],
    ["studio_monthly", "price_studio"],
  ])("uses the stable monthly price and linked customer with promotion codes for %s", async (kind, price) => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    const { status, body } = await readJson(await POST(request(kind)));
    expect(status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.test/session");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      customer: "cus_1", line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "required",
    }), expect.any(Object));
    expect(create.mock.calls[0][0]).not.toHaveProperty("discounts");
  });

  it.each([
    ["indie_yearly", "price_indie_yearly"],
    ["studio_yearly", "price_studio_yearly"],
  ])("uses the stable annual price with promotion codes for %s", async (kind, price) => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    expect((await POST(request(kind))).status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: expect.objectContaining({ kind }),
    }), expect.any(Object));
    expect(create.mock.calls[0][0]).not.toHaveProperty("discounts");
  });

  it("persists a new Stripe customer through the server-only client", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspaceWithoutCustomer());
    const update = vi.fn(() => createQueryBuilder({ data: { stripe_customer_id: "cus_new" }, error: null }));
    vi.mocked(createAdminSupabase).mockReturnValue({ rpc: attemptRpc, from: () => ({ ...createQueryBuilder({ data: null }), update }) } as never);
    vi.mocked(getStripe).mockReturnValue({
      customers: { create: vi.fn().mockResolvedValue({ id: "cus_new" }) },
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" }) } },
    } as never);
    expect((await POST(request("indie_monthly"))).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ stripe_customer_id: "cus_new" });
  });

  it("rejects a second active subscription", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn();
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [{ status: "active" }] }) },
      checkout: { sessions: { create } },
    } as never);
    const { status, body } = await readJson(await POST(request("studio_monthly")));
    expect(status).toBe(409);
    expect(body.error).toBe("SUBSCRIPTION_EXISTS");
    expect(create).not.toHaveBeenCalled();
  });

  describe("one-time pass", () => {
    function stripeWith(create: ReturnType<typeof vi.fn>) {
      vi.mocked(getStripe).mockReturnValue({
        subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
        checkout: { sessions: { create } },
      } as never);
    }

    it("is hidden when STRIPE_PRICE_PASS30 is not configured", async () => {
      vi.mocked(createServerSupabase).mockResolvedValue(workspace());
      vi.stubEnv("STRIPE_PRICE_PASS30", "");
      const create = vi.fn();
      stripeWith(create);
      const { status, body } = await readJson(await POST(request("pass30")));
      expect(status).toBe(503);
      expect(body.error).toBe("BILLING_UNCONFIGURED");
      expect(create).not.toHaveBeenCalled();
    });

    it("opens a one-time payment Checkout with promotion codes and without subscription data", async () => {
      vi.mocked(createServerSupabase).mockResolvedValue(workspace());
      vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
      const create = vi.fn().mockResolvedValue({ id: "cs_pass", url: "https://checkout.stripe.test/pass" });
      stripeWith(create);
      const { status, body } = await readJson(await POST(request("pass30")));
      expect(status).toBe(200);
      expect(body.url).toBe("https://checkout.stripe.test/pass");
      const params = create.mock.calls[0][0];
      expect(params).toEqual(expect.objectContaining({
        mode: "payment",
        allow_promotion_codes: true,
        customer: "cus_1",
        client_reference_id: "ws-1",
        line_items: [{ price: "price_pass30", quantity: 1 }],
        metadata: { kind: "pass30", workspace_id: "ws-1" },
        payment_intent_data: { metadata: { kind: "pass30", workspace_id: "ws-1" } },
      }));
      expect(params).not.toHaveProperty("subscription_data");
      expect(params).not.toHaveProperty("discounts");
    });

    it("keeps subscriptions in subscription mode when the pass is configured", async () => {
      vi.mocked(createServerSupabase).mockResolvedValue(workspace());
      vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
      const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" });
      stripeWith(create);
      expect((await POST(request("indie_monthly"))).status).toBe(200);
      expect(create.mock.calls[0][0]).toEqual(expect.objectContaining({ mode: "subscription", subscription_data: expect.any(Object) }));
      expect(create.mock.calls[0][0]).not.toHaveProperty("payment_intent_data");
    });

    it("does not sell a pass to a workspace that already subscribes", async () => {
      vi.mocked(createServerSupabase).mockResolvedValue(workspace("sub_1"));
      vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
      const create = vi.fn();
      stripeWith(create);
      expect((await POST(request("pass30"))).status).toBe(409);
      expect(create).not.toHaveBeenCalled();
    });
  });
});
