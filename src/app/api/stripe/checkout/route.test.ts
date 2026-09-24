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
const request = (kind: string) => new Request("http://localhost/api/stripe/checkout", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, next: "/tool" }),
});

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
  vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({}) as never);
  vi.stubEnv("STRIPE_INDIE_PRICE_ID", "price_indie");
  vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
  vi.stubEnv("STRIPE_INDIE_YEARLY_PRICE_ID", "price_indie_yearly");
  vi.stubEnv("STRIPE_STUDIO_YEARLY_PRICE_ID", "price_studio_yearly");
  vi.stubEnv("STRIPE_TAX_ENABLED", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/stripe/checkout", () => {
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

  it("uses the stable Indie price and linked customer", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    const { status, body } = await readJson(await POST(request("indie_monthly")));
    expect(status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.test/session");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      customer: "cus_1", line_items: [{ price: "price_indie", quantity: 1 }],
      billing_address_collection: "required",
    }), expect.any(Object));
  });

  it.each([
    ["indie_yearly", "price_indie_yearly"],
    ["studio_yearly", "price_studio_yearly"],
  ])("uses the stable annual price for %s", async (kind, price) => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
      checkout: { sessions: { create } },
    } as never);
    expect((await POST(request(kind))).status).toBe(200);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price, quantity: 1 }],
      metadata: expect.objectContaining({ kind }),
    }), expect.any(Object));
  });

  it("persists a new Stripe customer through the server-only client", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspaceWithoutCustomer());
    const update = vi.fn(() => createQueryBuilder({ data: { stripe_customer_id: "cus_new" }, error: null }));
    vi.mocked(createAdminSupabase).mockReturnValue({ from: () => ({ ...createQueryBuilder({ data: null }), update }) } as never);
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
});
