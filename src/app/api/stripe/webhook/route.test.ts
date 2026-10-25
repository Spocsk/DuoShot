import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, readJson } from "@/test/supabase-mock";
import { POST } from "./route";
import { sendUmamiServerEvent } from "@/lib/umami-server";

vi.mock("@/lib/umami-server", () => ({ sendUmamiServerEvent: vi.fn() }));

vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const request = (signature?: string) => new Request("http://localhost/api/stripe/webhook", {
  method: "POST", headers: signature ? { "stripe-signature": signature } : {}, body: "{}",
});

function setup(status: string, eventType = "checkout.session.completed", duplicate = false, priceId = "price_studio") {
  const update = vi.fn(() => createQueryBuilder({ data: {id:"ws-1"}, error: null }));
  const insert = vi.fn(() => createQueryBuilder({ data: null, error: duplicate ? { code: "23505" } : null }));
  const from = vi.fn((table: string) => table === "stripe_events"
    ? { ...createQueryBuilder({ data: duplicate ? {id:"evt_1"} : null, error: null }), insert }
    : { ...createQueryBuilder({ data: { stripe_customer_id: "cus_1", stripe_subscription_id: null, stripe_sync_version: 0 }, error: null }), update });
  vi.mocked(createAdminSupabase).mockReturnValue({ from } as never);
  const retrieve = vi.fn().mockResolvedValue({
    id: "sub_1", customer: "cus_1", status, metadata: { workspace_id: "ws-1" },
    items: { data: [{ price: { id: priceId }, current_period_end: 2_000_000_000 }] },
    cancel_at_period_end: status === "active",
  });
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: vi.fn(() => ({
      id: "evt_1", type: eventType, livemode: false,
      data: { object: eventType.startsWith("customer.subscription.") ? { id: "sub_1" }
        : eventType.startsWith("invoice.") ? { parent: { subscription_details: { subscription: "sub_1" } } }
          : { subscription: "sub_1" } },
    })) },
    subscriptions: { retrieve },
  } as never);
  return { update, insert, retrieve, from };
}

beforeEach(() => {
  vi.mocked(sendUmamiServerEvent).mockReset().mockResolvedValue(undefined);
  vi.mocked(getStripe).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", "");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
  vi.stubEnv("STRIPE_INDIE_PRICE_ID", "price_indie");
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
    ["price_indie", "indie", 1],
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
  it("re-reads Stripe after the revision lookup so a delayed activation cannot restore canceled access", async () => {
    const {retrieve,update}=setup("canceled");
    retrieve.mockResolvedValueOnce({id:"sub_1",customer:"cus_1",status:"active",metadata:{workspace_id:"ws-1"}});
    expect((await POST(request("valid"))).status).toBe(200);
    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({plan:"free",subscription_status:"canceled"}));
  });
  it("does not acknowledge an event when a competing projection changed the revision", async () => {
    const {update,insert}=setup("active");
    update.mockImplementation(()=>createQueryBuilder({data:null,error:null}) as never);
    expect((await POST(request("valid"))).status).toBe(500);
    expect(insert).not.toHaveBeenCalled();
  });
  it("ignores a late event from a replaced subscription", async () => {
    const {from,update,insert}=setup("canceled");
    const original=from.getMockImplementation()!;
    from.mockImplementation((table)=>table==="workspaces" ? {...createQueryBuilder({data:{stripe_customer_id:"cus_1",stripe_subscription_id:"sub_new",stripe_sync_version:3}}),update} : original(table));
    expect((await POST(request("valid"))).status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });
  it("acknowledges a subscription that DuoShot checkout did not create", async () => {
    const {retrieve,update,insert}=setup("active","customer.subscription.updated");
    retrieve.mockResolvedValue({id:"sub_1",customer:"cus_other",status:"active",metadata:{}});
    const { status, body } = await readJson(await POST(request("valid")));
    expect(status).toBe(200);
    expect(body.ignored).toBe("SUBSCRIPTION_UNLINKED");
    expect(update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });
  it.each([
    ["WORKSPACE_LOOKUP_FAILED", { data: null, error: { message: "connection reset" } }],
    ["WORKSPACE_NOT_FOUND", { data: null, error: null }],
    ["CUSTOMER_MISMATCH", { data: { stripe_customer_id: "cus_2", stripe_subscription_id: null, stripe_sync_version: 0 }, error: null }],
  ])("keeps a DuoShot subscription it cannot apply as a failed delivery (%s)", async (reason, lookup) => {
    const {from,update,insert}=setup("active");
    const original=from.getMockImplementation()!;
    from.mockImplementation((table)=>table==="workspaces" ? {...createQueryBuilder(lookup),update} : original(table));
    const { status, body } = await readJson(await POST(request("valid")));
    expect(status).toBe(500);
    expect(body.error).toBe(reason);
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
  it("rejects test events at a production endpoint", async () => {
    const {update,insert}=setup("active");vi.stubEnv("APP_ENV","production");
    expect((await POST(request("valid"))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();expect(insert).not.toHaveBeenCalled();
  });

  describe("one-time pass", () => {
    function passEvent(session: Record<string, unknown>, type = "checkout.session.completed", rpcResult: { data: unknown; error: unknown } = { data: { granted: true }, error: null }, duplicate = false) {
      const insert = vi.fn(() => createQueryBuilder({ data: null, error: null }));
      const update = vi.fn(() => createQueryBuilder({ data: null, error: null }));
      const rpc = vi.fn(async () => rpcResult);
      const from = vi.fn((table: string) => table === "stripe_events"
        ? { ...createQueryBuilder({ data: duplicate ? { id: "evt_pass" } : null, error: null }), insert }
        : { ...createQueryBuilder({ data: null, error: null }), update });
      vi.mocked(createAdminSupabase).mockReturnValue({ from, rpc } as never);
      const retrieve = vi.fn();
      vi.mocked(getStripe).mockReturnValue({
        webhooks: { constructEvent: vi.fn(() => ({
          id: "evt_pass", type, livemode: false,
          data: { object: { id: "cs_pass", mode: "payment", payment_status: "paid", customer: "cus_1", client_reference_id: "ws-1", metadata: { kind: "pass30", workspace_id: "ws-1" }, ...session } },
        })) },
        subscriptions: { retrieve },
      } as never);
      return { rpc, insert, update, retrieve };
    }

    it("records a 30-day pass for a paid one-time Checkout", async () => {
      const { rpc, insert, update, retrieve } = passEvent({});
      const { status, body } = await readJson(await POST(request("valid")));
      expect(status).toBe(200);
      expect(body.received).toBe(true);
      expect(rpc).toHaveBeenCalledWith("grant_workspace_pass", { p_workspace_id: "ws-1", p_session_id: "cs_pass", p_customer_id: "cus_1", p_days: 30 });
      expect(retrieve).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(insert).toHaveBeenCalledWith({ id: "evt_pass", type: "checkout.session.completed" });
    });

    it("is idempotent: a duplicate event is not reprocessed and a replayed session is not extended twice", async () => {
      const duplicate = passEvent({}, "checkout.session.completed", { data: null, error: null }, true);
      expect((await readJson(await POST(request("valid")))).body.duplicate).toBe(true);
      expect(duplicate.rpc).not.toHaveBeenCalled();
      // A second event for the same session (e.g. async_payment_succeeded after completed)
      // reaches the RPC, which is keyed on the session id and reports granted=false.
      const replay = passEvent({}, "checkout.session.async_payment_succeeded", { data: { granted: false }, error: null });
      expect((await POST(request("valid"))).status).toBe(200);
      expect(replay.rpc).toHaveBeenCalledWith("grant_workspace_pass", expect.objectContaining({ p_session_id: "cs_pass" }));
    });

    it("waits for async payment confirmation before granting", async () => {
      const { rpc, insert } = passEvent({ payment_status: "unpaid" });
      expect((await POST(request("valid"))).status).toBe(200);
      expect(rpc).not.toHaveBeenCalled();
      expect(insert).toHaveBeenCalled();
    });

    it("acknowledges payments DuoShot checkout did not create", async () => {
      const { rpc } = passEvent({ metadata: {}, client_reference_id: null });
      const { status, body } = await readJson(await POST(request("valid")));
      expect(status).toBe(200);
      expect(body.ignored).toBe("PAYMENT_UNLINKED");
      expect(rpc).not.toHaveBeenCalled();
    });

    it("keeps a pass it cannot apply as a failed delivery", async () => {
      const { insert } = passEvent({}, "checkout.session.completed", { data: null, error: { message: "CUSTOMER_MISMATCH" } });
      const { status, body } = await readJson(await POST(request("valid")));
      expect(status).toBe(500);
      expect(body.error).toBe("CUSTOMER_MISMATCH");
      expect(insert).not.toHaveBeenCalled();
    });
  });
});


describe("Stripe revenue analytics", () => {
  function revenueEvent({ live = true, type = "invoice.paid", amount = 1200, linked = true, paid = true, markerError = null as { code: string } | null } = {}) {
    let marked = false;
    const insert = vi.fn(async () => { marked = !markerError; return { error: markerError }; });
    const update = vi.fn(() => createQueryBuilder({ data: { id: "ws-1" }, error: null }));
    const from = vi.fn((table: string) => {
      if (table === "stripe_events") return { ...createQueryBuilder({ data: marked ? { id: "evt_revenue" } : null, error: null }), insert };
      if (table === "workspace_members") return createQueryBuilder({ data: { user_id: "owner-1" }, error: null });
      return { ...createQueryBuilder({ data: { stripe_customer_id: "cus_1", stripe_subscription_id: null, stripe_sync_version: 0 }, error: null }), update };
    });
    vi.mocked(createAdminSupabase).mockReturnValue({ from, rpc: vi.fn().mockResolvedValue({ data: { granted: true }, error: null }) } as never);
    const object = type === "invoice.paid" ? {
      amount_paid: amount, currency: "eur", billing_reason: "subscription_create",
      parent: { subscription_details: { subscription: "sub_1" } },
    } : {
      id: "cs_private", mode: "payment", payment_status: paid ? "paid" : "unpaid", amount_total: amount, currency: "eur",
      customer: "cus_1", client_reference_id: "ws-1", metadata: linked ? { workspace_id: "ws-1", kind: "pass30" } : {},
    };
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: () => ({ id: "evt_revenue", type, livemode: live, data: { object } }) },
      subscriptions: { retrieve: vi.fn().mockResolvedValue({ id: "sub_1", status: "active", customer: "cus_1", metadata: linked ? { workspace_id: "ws-1" } : {}, items: { data: [{ price: { id: "price_indie", recurring: { interval: "month" } } }] } }) },
    } as never);
    if (live) { vi.stubEnv("APP_ENV", "production"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example"); vi.stubEnv("ANALYTICS_INTERNAL_USER_IDS", ""); }
    return { insert, from, object };
  }

  it("sends 1200 cents as revenue 12 once, after inserting the idempotence marker", async () => {
    const { insert } = revenueEvent();
    vi.mocked(sendUmamiServerEvent).mockImplementation(async () => { expect(insert).toHaveBeenCalledOnce(); });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).toHaveBeenCalledExactlyOnceWith("payment_succeeded", {
      revenue: 12, currency: "EUR", plan: "indie", interval: "month", billing_reason: "subscription_create", audience: "external",
    });
    expect((await readJson(await POST(request("valid")))).body.duplicate).toBe(true);
    expect(sendUmamiServerEvent).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(sendUmamiServerEvent).mock.calls)).not.toMatch(/cus_|cs_|sub_|ws-|owner-/);
  });
  it("never sends test mode revenue", async () => {
    revenueEvent({ live: false });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).not.toHaveBeenCalled();
  });
  it("keeps webhook 200 when Umami throws", async () => {
    revenueEvent(); vi.mocked(sendUmamiServerEvent).mockRejectedValue(new Error("offline"));
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).toHaveBeenCalledOnce();
  });
  it.each(["23505", "XX000"])("does not send after marker insertion failure %s", async (code) => {
    revenueEvent({ markerError: { code } });
    expect((await POST(request("valid"))).status).toBe(code === "23505" ? 200 : 500);
    expect(sendUmamiServerEvent).not.toHaveBeenCalled();
  });
  it.each([0, -100])("ignores invoices without positive payment (%s)", async (amount) => {
    revenueEvent({ amount });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).not.toHaveBeenCalled();
  });
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])("reports paid and synced Pass revenue for %s", async (type) => {
    revenueEvent({ type, amount: 1900 });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).toHaveBeenCalledExactlyOnceWith("payment_succeeded", { revenue: 19, currency: "EUR", plan: "pass30", audience: "external" });
  });
  it.each([{ linked: false }, { paid: false }])("ignores an unlinked or unpaid Pass: %j", async (options) => {
    revenueEvent({ type: "checkout.session.completed", ...options });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).not.toHaveBeenCalled();
  });
  it("does not count subscription Checkout revenue or unlinked invoices", async () => {
    const { object } = revenueEvent({ type: "checkout.session.completed" });
    Object.assign(object, { mode: "subscription", subscription: "sub_1" });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).not.toHaveBeenCalled();
    revenueEvent({ linked: false });
    expect((await POST(request("valid"))).status).toBe(200);
    expect(sendUmamiServerEvent).not.toHaveBeenCalled();
  });
});
