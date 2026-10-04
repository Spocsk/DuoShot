import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { DELETE } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const user = { id: "user-1" };
const call = () => DELETE(new Request("http://localhost/api/workspace/invitations/inv-1", { method: "DELETE" }), { params: Promise.resolve({ id: "inv-1" }) });
const session = (role: string | null) => vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
  user, from: () => createQueryBuilder({ data: role ? { workspace_id: "ws-1", role } : null, error: null }),
}) as never);
function chain(result: unknown, calls: unknown[][]) {
  const builder: Record<string, unknown> = { maybeSingle: async () => result };
  for (const method of ["select", "update", "eq", "is"]) builder[method] = (...args: unknown[]) => { calls.push([method, ...args]); return builder; };
  return builder;
}
function admin(data: unknown) {
  const calls: unknown[][] = [];
  const from = vi.fn(() => chain({ data, error: null }, calls));
  vi.mocked(createAdminSupabase).mockReturnValue({ from } as never);
  return { from, calls };
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
});

describe("DELETE /api/workspace/invitations/[id]", () => {
  it("requires a signed-in owner", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await call()).status).toBe(401);
    session(null);
    expect(await readJson(await call())).toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    session("member");
    expect((await call()).status).toBe(403);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("revokes a pending invitation scoped to the owner's workspace", async () => {
    session("owner");
    const { from, calls } = admin({ id: "inv-1" });
    const { status, body } = await readJson(await call());
    expect(status).toBe(200);
    expect(body).toEqual({ id: "inv-1", revokedAt: expect.any(String) });
    expect(from).toHaveBeenCalledWith("workspace_invitations");
    expect(calls).toEqual([
      ["update", { revoked_at: body.revokedAt }],
      ["eq", "id", "inv-1"],
      ["eq", "workspace_id", "ws-1"],
      ["is", "accepted_at", null],
      ["select", "id"],
    ]);
  });

  it("returns 404 for unknown, foreign or accepted invitations", async () => {
    session("owner");
    admin(null);
    expect(await readJson(await call())).toEqual({ status: 404, body: { error: "NOT_FOUND" } });
  });

  it("returns 503 without an admin client", async () => {
    session("owner");
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await call()).status).toBe(503);
  });

  it.todo("should not re-revoke: without a revoked_at filter a second DELETE returns 200 and overwrites revoked_at (route.ts:27-34)");
});
