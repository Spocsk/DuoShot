import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: vi.fn(),
}));

function request(body: string, signature?: string) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

beforeEach(() => {
  vi.mocked(getStripe).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/webhook", () => {
  it("returns 503 when webhook secrets are missing", async () => {
    vi.mocked(getStripe).mockReturnValue(null);
    const { status, body } = await readJson(await POST(request("{}")));
    expect(status).toBe(503);
    expect(body.error).toBe("WEBHOOK_UNCONFIGURED");
  });

  it("returns 400 without a signature", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.mocked(getStripe).mockReturnValue({ webhooks: { constructEvent: vi.fn() } } as never);
    const { status, body } = await readJson(await POST(request("{}")));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_SIGNATURE");
  });

  it("returns 400 for an invalid signature", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad sig");
        }),
      },
    } as never);
    const { status, body } = await readJson(await POST(request("{}", "sig_bad")));
    expect(status).toBe(400);
    expect(body.error).toBe("INVALID_SIGNATURE");
  });

  it("persists Studio on checkout.session.completed", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const update = vi.fn(() => createQueryBuilder({ data: null, error: null }));
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: () => ({ ...createQueryBuilder({ data: null }), update }),
      }) as never,
    );
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: "checkout.session.completed",
          data: {
            object: {
              metadata: { workspace_id: "ws-1", kind: "studio_monthly" },
              subscription: "sub_1",
              customer: "cus_1",
            },
          },
        })),
      },
    } as never);
    const { status, body } = await readJson(await POST(request("{}", "sig_ok")));
    expect(status).toBe(200);
    expect(body.received).toBe(true);
    expect(update).toHaveBeenCalledWith({
      plan: "studio",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      subscription_status: "active",
    });
  });

  it("marks the workspace free on subscription.deleted", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const update = vi.fn(() => createQueryBuilder({ data: null, error: null }));
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: () => ({ ...createQueryBuilder({ data: null }), update }),
      }) as never,
    );
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: "customer.subscription.deleted",
          data: {
            object: {
              id: "sub_1",
              metadata: { workspace_id: "ws-1" },
              customer: "cus_1",
            },
          },
        })),
      },
    } as never);
    const { status, body } = await readJson(await POST(request("{}", "sig_ok")));
    expect(status).toBe(200);
    expect(body.received).toBe(true);
    expect(update).toHaveBeenCalledWith({
      plan: "free",
      stripe_subscription_id: null,
      subscription_status: "canceled",
    });
  });
});
