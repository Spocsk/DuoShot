import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const user = { id: "user-1", email: "a@example.com" };
const TOKEN = "Tok3n_abcdefABCDEF0123456789-xyz";
const tokenHash = createHash("sha256").update(TOKEN).digest("hex");
const request = (query = `token=${TOKEN}`) => new Request(`http://localhost/api/stripe/call-trial?${query}`);
const location = (response: Response) => response.headers.get("location") ?? "";

function workspace(stripeSubscriptionId: string | null = null, customerId: string | null = "cus_1") {
  return createSupabaseMock({
    user,
    from: (table) => createQueryBuilder({ data: table === "workspace_members"
      ? { workspace_id: "ws-1", role: "owner" }
      : { stripe_customer_id: customerId, stripe_subscription_id: stripeSubscriptionId }, error: null }),
  }) as never;
}

const claimRpc = (result: { data: unknown; error: unknown }) =>
  vi.fn(async (name: string) => (name === "claim_call_trial" ? result : { data: null, error: null }));

function stripeWith(create: ReturnType<typeof vi.fn>, subscriptions: unknown[] = [], retrieve?: ReturnType<typeof vi.fn>) {
  vi.mocked(getStripe).mockReturnValue({
    subscriptions: { list: vi.fn().mockResolvedValue({ data: subscriptions }) },
    checkout: { sessions: { create, retrieve: retrieve ?? vi.fn() } },
  } as never);
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(getStripe).mockReset();
  vi.mocked(createAdminSupabase).mockReset().mockReturnValue(createSupabaseMock({}) as never);
  vi.stubEnv("STRIPE_INDIE_PRICE_ID", "price_indie");
  vi.stubEnv("STRIPE_STUDIO_PRICE_ID", "price_studio");
  vi.stubEnv("STRIPE_INDIE_YEARLY_PRICE_ID", "price_indie_yearly");
  vi.stubEnv("STRIPE_STUDIO_YEARLY_PRICE_ID", "price_studio_yearly");
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  vi.stubEnv("SUPABASE_SECRET_KEY", "example");
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/stripe/call-trial", () => {
  it("sends anonymous visitors to log in and resume the exact link", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const response = await GET(request());
    expect(response.status).toBe(303);
    const target = new URL(location(response));
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("next")).toBe(`/api/stripe/call-trial?token=${TOKEN}`);

    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const enTarget = new URL(location(await GET(request(`token=${TOKEN}&locale=en`))));
    expect(enTarget.pathname).toBe("/en/login");
    expect(enTarget.searchParams.get("next")).toBe(`/api/stripe/call-trial?token=${TOKEN}&locale=en`);
  });

  it("redirects a malformed token to pricing without touching Supabase or Stripe", async () => {
    const response = await GET(request("token=short"));
    expect(response.status).toBe(303);
    expect(location(response)).toBe("http://localhost:3000/pricing?trial=invalid");
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("refuses a workspace that already has a subscription", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn();
    stripeWith(create, [{ status: "active" }]);
    const response = await GET(request());
    expect(location(response)).toBe("http://localhost:3000/pricing?trial=exists");
    expect(create).not.toHaveBeenCalled();
  });

  it("maps an already-used token to ?trial=used", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc: claimRpc({ data: null, error: { message: "TRIAL_ALREADY_USED" } }) }) as never);
    const create = vi.fn();
    stripeWith(create);
    expect(location(await GET(request()))).toBe("http://localhost:3000/pricing?trial=used");
    expect(create).not.toHaveBeenCalled();
  });

  it("redirects to ?trial=unavailable when the Indie price is not configured", async () => {
    vi.stubEnv("STRIPE_INDIE_PRICE_ID", "");
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const create = vi.fn();
    stripeWith(create);
    expect(location(await GET(request()))).toBe("http://localhost:3000/pricing?trial=unavailable");
    expect(create).not.toHaveBeenCalled();
  });

  it("opens a no-payment 7-day trial Checkout with the call7d offer on both metadata", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    const save = vi.fn<(name: string, args: unknown) => Promise<{ data: null; error: null }>>().mockResolvedValue({ data: null, error: null });
    const rpc = vi.fn(async (name: string, args: unknown) => {
      if (name === "claim_call_trial") return { data: { session_id: null }, error: null };
      return save(name, args);
    });
    vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc }) as never);
    const create = vi.fn().mockResolvedValue({ id: "cs_trial", url: "https://checkout.stripe.test/trial" });
    stripeWith(create);

    const response = await GET(request());
    expect(response.status).toBe(303);
    expect(location(response)).toBe("https://checkout.stripe.test/trial");
    const metadata = { offer: "call7d", kind: "indie_monthly", workspace_id: "ws-1" };
    expect(create).toHaveBeenCalledWith({
      mode: "subscription",
      line_items: [{ price: "price_indie", quantity: 1 }],
      customer: "cus_1",
      client_reference_id: "ws-1",
      payment_method_collection: "if_required",
      subscription_data: {
        trial_period_days: 7,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata,
      },
      success_url: "http://localhost:3000/tool?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/tool?checkout=cancel",
      metadata,
    }, { idempotencyKey: `duoshot-call7d-${tokenHash.slice(0, 16)}` });
    expect(rpc).toHaveBeenCalledWith("claim_call_trial", { p_token_hash: tokenHash, p_workspace_id: "ws-1", p_customer_id: "cus_1" });
    expect(save).toHaveBeenCalledWith("save_call_trial_session", { p_token_hash: tokenHash, p_session_id: "cs_trial" });
  });

  it("reuses the session already opened for the token on retry", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(workspace());
    vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc: claimRpc({ data: { session_id: "cs_prev" }, error: null }) }) as never);
    const create = vi.fn();
    const retrieve = vi.fn().mockResolvedValue({ status: "open", url: "https://checkout.stripe.test/resumed" });
    stripeWith(create, [], retrieve);
    expect(location(await GET(request()))).toBe("https://checkout.stripe.test/resumed");
    expect(retrieve).toHaveBeenCalledWith("cs_prev");
    expect(create).not.toHaveBeenCalled();
  });
});
