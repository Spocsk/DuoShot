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

  it("reports a failed membership lookup instead of refusing the owner", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
      user, from: () => createQueryBuilder({ data: null, error: { message: "timeout" } }),
    }) as never);
    expect(await readJson(await GET())).toEqual({ status: 503, body: { error: "WORKSPACE_UNAVAILABLE" } });
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("lists the owner's workspace members with their emails in one lookup", async () => {
    session("owner");
    const eq = vi.fn();
    const members = [
      { id: "m-1", user_id: "user-1", role: "owner", created_at: "2026-01-01" },
      { id: "m-2", user_id: "user-2", role: "member", created_at: "2026-01-02" },
    ];
    const rpc = vi.fn(async () => ({ data: [{ user_id: "user-1", email: "owner@example.com" }], error: null }));
    const getUserById = vi.fn();
    vi.mocked(createAdminSupabase).mockReturnValue({
      from: () => ({ select: () => ({ eq: (...args: unknown[]) => { eq(...args); return createQueryBuilder({ data: members, error: null }); } }) }),
      rpc,
      auth: { admin: { getUserById } },
    } as never);
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(eq).toHaveBeenCalledWith("workspace_id", "ws-1");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("workspace_member_emails", { p_workspace: "ws-1" });
    expect(getUserById).not.toHaveBeenCalled();
    expect(body).toEqual({ limit: 3, members: [
      { ...members[0], email: "owner@example.com" },
      { ...members[1], email: null },
    ] });
  });

  it("returns an empty list when the query yields nothing", async () => {
    session("owner");
    vi.mocked(createAdminSupabase).mockReturnValue({
      from: () => createQueryBuilder({ data: null, error: null }),
      rpc: async () => ({ data: null, error: null }),
    } as never);
    expect(await readJson(await GET())).toEqual({ status: 200, body: { members: [], limit: 3 } });
  });

  it("reports 503 instead of a list without emails when either lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [membersError, emailsError] of [[{ message: "timeout" }, null], [null, { message: "function missing" }]]) {
      session("owner");
      vi.mocked(createAdminSupabase).mockReturnValue({
        from: () => createQueryBuilder({ data: [], error: membersError }),
        rpc: async () => ({ data: null, error: emailsError }),
      } as never);
      expect(await readJson(await GET())).toEqual({ status: 503, body: { error: "MEMBERS_UNAVAILABLE" } });
    }
  });

  it("returns 503 without an admin client", async () => {
    session("owner");
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await GET()).status).toBe(503);
  });
});
