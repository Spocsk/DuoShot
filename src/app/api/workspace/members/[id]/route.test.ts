import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { DELETE } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const user = { id: "user-1" };
const call = (id = "m-2") => DELETE(new Request(`http://localhost/api/workspace/members/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
const session = (role: string | null) => vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
  user, from: () => createQueryBuilder({ data: role ? { workspace_id: "ws-1", role } : null, error: null }),
}) as never);
function chain(result: unknown, calls: unknown[][]) {
  const builder: Record<string, unknown> = {
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "update", "delete", "eq", "neq", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => { calls.push([method, ...args]); return builder; };
  }
  return builder;
}
/** Each admin.from() call answers with the next queued row and records its own chain. */
function admin(...rows: unknown[]) {
  const queries: unknown[][][] = [];
  vi.mocked(createAdminSupabase).mockReturnValue({ from: () => {
    const calls: unknown[][] = [];
    queries.push(calls);
    return chain({ data: rows[queries.length - 1] ?? null, error: null }, calls);
  } } as never);
  return queries;
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
});

describe("DELETE /api/workspace/members/[id]", () => {
  it("requires a signed-in owner", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await call()).status).toBe(401);
    session(null);
    expect((await call()).status).toBe(403);
    session("member");
    expect(await readJson(await call())).toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("only deletes non-owner members of the owner's workspace", async () => {
    session("owner");
    const queries = admin({ id: "m-2", user_id: "user-2" }, null);
    expect(await readJson(await call())).toEqual({ status: 200, body: { id: "m-2", revoked: true } });
    expect(queries[0]).toEqual([
      ["delete"],
      ["eq", "id", "m-2"],
      ["eq", "workspace_id", "ws-1"],
      ["neq", "role", "owner"],
      ["select", "id, user_id"],
    ]);
  });

  it("returns 404 for the owner row, foreign or unknown members", async () => {
    session("owner");
    const queries = admin(null);
    expect(await readJson(await call("m-1"))).toEqual({ status: 404, body: { error: "NOT_FOUND" } });
    expect(queries).toHaveLength(1);
  });

  it("reactivates the removed user's oldest remaining workspace", async () => {
    session("owner");
    const queries = admin({ id: "m-2", user_id: "user-2" }, { id: "m-personal" });
    expect((await call()).status).toBe(200);
    expect(queries[1]).toEqual([
      ["select", "id"],
      ["eq", "user_id", "user-2"],
      ["order", "created_at", { ascending: true }],
      ["limit", 1],
    ]);
    expect(queries[2]).toEqual([["update", { active: true }], ["eq", "id", "m-personal"]]);
  });

  it("skips reactivation when the user has no other workspace", async () => {
    session("owner");
    const queries = admin({ id: "m-2", user_id: "user-2" }, null);
    expect((await call()).status).toBe(200);
    expect(queries).toHaveLength(2);
  });

  it("returns 503 without an admin client", async () => {
    session("owner");
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await call()).status).toBe(503);
  });

  it.todo("should only reactivate a fallback when the removed membership was active, and surface the update error (route.ts:35-42)");
});
