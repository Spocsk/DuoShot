import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEntitlements } from "@/lib/billing";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/billing", () => ({
  resolveEntitlements: vi.fn(),
}));

const USER = { id: "user-1", email: "a@example.com" };

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(resolveEntitlements).mockReset();
});

describe("GET /api/billing/status", () => {
  it("returns 401 without a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const { status, body } = await readJson(await GET());
    expect(status).toBe(401);
    expect(body.error).toBe("AUTH_REQUIRED");
  });

  it("returns free defaults without a workspace", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: () => createQueryBuilder({ data: null }),
      }) as never,
    );
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(body).toEqual({
      plan: "free",
      source: "none",
      remainingFreeExports: 2,
      canUse69: false,
    });
    expect(resolveEntitlements).not.toHaveBeenCalled();
  });

  it("returns workspace entitlements", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") return createQueryBuilder({ data: { workspace_id: "ws-1" } });
          return createQueryBuilder({ data: { plan: "studio", free_exports_used: 0 } });
        },
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue({
      plan: "studio",
      source: "workspace",
      remainingFreeExports: null,
      canUse69: true,
    });
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(body.plan).toBe("studio");
    expect(body.canUse69).toBe(true);
    expect(resolveEntitlements).toHaveBeenCalledWith({
      email: USER.email,
      workspaceId: "ws-1",
      freeExportsUsed: 0,
      workspacePlan: "studio",
    });
  });
});
