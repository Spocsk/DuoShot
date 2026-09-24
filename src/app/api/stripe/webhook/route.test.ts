import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const request = (signature?: string) => new Request("http://localhost/api/stripe/webhook", {
  method: "POST", headers: signature ? { "stripe-signature": signature } : {}, body: "{}",
});

function setup(status: string, eventType = "checkout.session.completed", duplicate = false, priceId = "price_studio") {
  const update = vi.fn(() => createQueryBuilder({ data: null, error: null }));
  const insert = vi.fn(() => createQueryBuilder({ data: null, error: duplicate ? { code: "23505" } : null }));
  const from = vi.fn((table: string) => table === "stripe_events"
    ? { ...createQueryBuilder({ data: null, error: null }), insert }
    : { ...createQueryBuilder({ data: { stripe_customer_id: "cus_1", stripe_subscription_id: null }, error: null }), update });
  vi.mocked(createAdminSupabase).mockReturnValue({ from } as never);
  const retrieve = vi.fn().mockResolvedValue({
    id: "sub_1", customer: "cus_1", status, metadata: { workspace_id: "ws-1" },
    items: { data: [{ price: { id: priceId }, current_period_end: 2_000_000_000 }] },
    cancel_at_period_end: status === "active",
  });
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => ({
      id: "evt_1", type: eventType,
      data: { object: eventType.startsWith("customer.subscription.") ? { id: "sub_1" }
        : eventType.startsWith("invoice.") ? { parent: { subscription_details: { subscription: "sub_1" } } }
          : { subscription: "sub_1" } },
    })) },
    subscriptions: { retrieve },
  } as never);
  return { update, insert, retrieve };
}

beforeEach(() => {
  vi.mocked(getStripe).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
  vi.stubEnv("STRIPE_STUDIO_YEARLY_PRICE_ID", "price_studio_yearly");
  vi.stubEnv("STRIPE_INDIE_YEARLY_PRICE_ID", "price_indie_yearly");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/stripe/webhook", () => {
  it("rejects missing configuration or signature", async () => {
    vi.mocked(getStripe).mockReturnValue(null);
    expect((await POST(request())).status).toBe(503);
    setup("active");
    expect((await POST(request())).status).toBe(400);
  });

  it("rejects invalid signatures", async () => {
    setup("active");
    vi.mocked(getStripe).mockReturnValue({ webhooks: { constructEvent: () => { throw new Error("invalid"); } } } as never);
    expect((await POST(request("bad"))).status).toBe(400);
  });

  it("projects active Studio from the current Stripe subscription", async () => {
    const { update, retrieve } = setup("active");
    const { status, body } = await readJson(await POST(request("valid")));
    expect(status).toBe(200);
    expect(body.received).toBe(true);
    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      plan: "studio", seats: 3, stripe_subscription_id: "sub_1", subscription_status: "active",
      subscription_cancel_at_period_end: true,
    }));
  });

  it.each([
    ["price_indie_yearly", "indie", 1],
    ["price_studio_yearly", "studio", 3],
  ])("keeps annual price %s on its paid plan", async (priceId, plan, seats) => {
    const { update } = setup("active", "customer.subscription.updated", false, priceId);
    expect((await POST(request("valid"))).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan, seats, stripe_price_id: priceId }));
  });

  it("does not apply a duplicate event twice", async () => {
    const { update, retrieve } = setup("active", "checkout.session.completed", true);
    const { body } = await readJson(await POST(request("valid")));
    expect(body.duplicate).toBe(true);
    expect(retrieve).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("revokes paid access after cancellation", async () => {
    const { update } = setup("canceled", "customer.subscription.deleted");
    expect((await POST(request("valid"))).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      plan: "free", seats: 1, stripe_subscription_id: null, subscription_status: "canceled",
    }));
  });

  it("removes paid access when an invoice failure leaves the subscription past due", async () => {
    const { update } = setup("past_due", "invoice.payment_failed");
    expect((await POST(request("valid"))).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan: "free", subscription_status: "past_due" }));
  });
});
