import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/site", () => ({ getSiteUrl: () => "https://duoshot.example" }));
const request = () => new Request("http://localhost/api/stripe/portal", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "en" }),
});

beforeEach(() => { vi.mocked(getStripe).mockReset(); vi.mocked(createServerSupabase).mockReset(); });

describe("POST /api/stripe/portal", () => {
  it("requires an authenticated billing owner", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await POST(request())).status).toBe(401);
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
      user: { id: "user-1" },
      from: () => createQueryBuilder({ data: { workspace_id: "ws-1", role: "member" } }),
    }) as never);
    expect((await POST(request())).status).toBe(403);
  });

  it("opens the existing Stripe customer's portal", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
      user: { id: "user-1" },
      from: (table) => createQueryBuilder({ data: table === "workspace_members"
        ? { workspace_id: "ws-1", role: "owner" } : { stripe_customer_id: "cus_1" } }),
    }) as never);
    const create = vi.fn().mockResolvedValue({ url: "https://billing.stripe.test/session" });
    vi.mocked(getStripe).mockReturnValue({ billingPortal: { sessions: { create } } } as never);
    const { status, body } = await readJson(await POST(request()));
    expect(status).toBe(200);
    expect(body.url).toBe("https://billing.stripe.test/session");
    expect(create).toHaveBeenCalledWith({ customer: "cus_1", return_url: "https://duoshot.example/en/account" });
  });
});
