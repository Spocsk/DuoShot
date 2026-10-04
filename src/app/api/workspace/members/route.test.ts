import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const user = { id: "user-1" };
const session = (role: string | null) => vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
  user, from: () => createQueryBuilder({ data: role ? { workspace_id: "ws-1", role } : null, error: null }),
}) as never);

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
});

describe("GET /api/workspace/members", () => {
  it("requires a signed-in owner", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await GET()).status).toBe(401);
    session(null);
    expect((await GET()).status).toBe(403);
    session("member");
    expect(await readJson(await GET())).toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("lists the owner's workspace members with their emails", async () => {
    session("owner");
    const eq = vi.fn();
    const members = [
      { id: "m-1", user_id: "user-1", role: "owner", created_at: "2026-01-01" },
      { id: "m-2", user_id: "user-2", role: "member", created_at: "2026-01-02" },
    ];
    const getUserById = vi.fn(async (id: string) => ({ data: { user: id === "user-1" ? { email: "owner@example.com" } : null } }));
    vi.mocked(createAdminSupabase).mockReturnValue({
      from: () => ({ select: () => ({ eq: (...args: unknown[]) => { eq(...args); return createQueryBuilder({ data: members, error: null }); } }) }),
      auth: { admin: { getUserById } },
    } as never);
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(eq).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(getUserById.mock.calls.map(([id]) => id)).toEqual(["user-1", "user-2"]);
    expect(body).toEqual({ limit: 3, members: [
      { ...members[0], email: "owner@example.com" },
      { ...members[1], email: null },
    ] });
  });

  it("returns an empty list when the query yields nothing", async () => {
    session("owner");
    vi.mocked(createAdminSupabase).mockReturnValue({ from: () => createQueryBuilder({ data: null, error: null }), auth: { admin: { getUserById: vi.fn() } } } as never);
    expect(await readJson(await GET())).toEqual({ status: 200, body: { members: [], limit: 3 } });
  });

  it("returns 503 without an admin client", async () => {
    session("owner");
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await GET()).status).toBe(503);
  });
});
