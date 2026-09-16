import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: vi.fn(),
  getStripe: vi.fn(),
}));
vi.mock("@/lib/site", () => ({
  getSiteUrl: () => "https://duoshot.example",
}));

const USER = { id: "user-1", email: "a@example.com" };

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(isStripeConfigured).mockReset();
  vi.mocked(getStripe).mockReset();
});

describe("POST /api/stripe/checkout", () => {
  it("returns 401 without a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(401);
    expect(body.error).toBe("AUTH_REQUIRED");
  });

  it("returns 400 without a workspace", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: () => createQueryBuilder({ data: null }),
      }) as never,
    );
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_WORKSPACE");
  });

  it("returns a mock checkout URL when Stripe is absent", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: () => createQueryBuilder({ data: { workspace_id: "ws-1" } }),
      }) as never,
    );
    vi.mocked(isStripeConfigured).mockReturnValue(false);
    const { status, body } = await readJson(await POST(jsonRequest({ kind: "indie_monthly", next: "/tool" })));
    expect(status).toBe(200);
    expect(body.url).toBe("https://duoshot.example/tool?checkout=mock&kind=indie_monthly");
  });
});
