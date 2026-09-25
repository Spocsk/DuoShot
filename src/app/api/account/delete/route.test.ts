import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { removeStorageObjects } from "@/lib/storage-cleanup";
import { POST } from "./route";

vi.mock("@/lib/storage-cleanup", () => ({ removeStorageObjects: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));

beforeEach(() => { vi.mocked(getStripe).mockReset(); vi.mocked(createServerSupabase).mockReset(); });

describe("POST /api/account/delete", () => {
  it("cancels the active subscription before erasing an owner", async () => {
    const order: string[] = [];
    vi.mocked(removeStorageObjects).mockImplementation(async () => { order.push("storage"); return { removed: 2, complete: true }; });
    vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc: async () => { order.push("erase"); return { data: null, error: null }; } }) as never);
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
      user: { id: "user-1" },
      from: (table) => createQueryBuilder({ data: table === "workspace_members"
        ? [{ workspace_id: "ws-1" }] : { stripe_subscription_id: "sub_1" }, error: null }),
      rpc: async () => { order.push("erase"); return { data: null, error: null }; },
    }) as never);
    vi.mocked(getStripe).mockReturnValue({ subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ status: "active" }),
      cancel: vi.fn().mockImplementation(async () => { order.push("cancel"); return { id: "sub_1" }; }),
    } } as never);
    const { status, body } = await readJson(await POST());
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(order).toEqual(["cancel", "storage", "erase"]);
  });

  it("keeps the account if Stripe cancellation fails", async () => {
    const rpc = vi.fn();
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
      user: { id: "user-1" },
      from: (table) => createQueryBuilder({ data: table === "workspace_members"
        ? [{ workspace_id: "ws-1" }] : { stripe_subscription_id: "sub_1" }, error: null }),
      rpc,
    }) as never);
    vi.mocked(getStripe).mockReturnValue({ subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ status: "active" }),
      cancel: vi.fn().mockRejectedValue(new Error("Stripe unavailable")),
    } } as never);
    const { status } = await readJson(await POST());
    expect(status).toBe(502);
    expect(rpc).not.toHaveBeenCalled();
  });
});
