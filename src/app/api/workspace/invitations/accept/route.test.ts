import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const user = { id: "user-2", email: "new@example.com" };
const request = (body: unknown) => new Request("http://localhost/api/workspace/invitations/accept", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
function admin(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc }) as never);
  return rpc;
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset().mockResolvedValue(createSupabaseMock({ user }) as never);
  vi.mocked(createAdminSupabase).mockReset();
});

describe("POST /api/workspace/invitations/accept", () => {
  it("requires a session and a token", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await POST(request({ token: "abc" }))).status).toBe(401);
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user }) as never);
    expect(await readJson(await POST(request({})))).toEqual({ status: 400, body: { error: "INVALID_TOKEN" } });
    expect(await readJson(await POST(request({ token: "" })))).toEqual({ status: 400, body: { error: "INVALID_TOKEN" } });
    expect(await readJson(await POST(request({ token: 7 })))).toEqual({ status: 400, body: { error: "INVALID_TOKEN" } });
    const raw = new Request("http://localhost/api/workspace/invitations/accept", { method: "POST", body: "null" });
    expect(await readJson(await POST(raw))).toEqual({ status: 400, body: { error: "INVALID_TOKEN" } });
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("accepts with the token hash, never the raw token", async () => {
    const rpc = admin({ data: "ws-1", error: null });
    expect(await readJson(await POST(request({ token: "secret-token" })))).toEqual({ status: 200, body: { workspaceId: "ws-1", accepted: true } });
    expect(rpc).toHaveBeenCalledWith("accept_workspace_invitation", {
      p_token_hash: createHash("sha256").update("secret-token").digest("hex"), p_user_id: "user-2",
    });
  });

  it.each([
    ["INVITE_EXPIRED", 410],
    ["EMAIL_MISMATCH", 403],
    ["SEAT_LIMIT", 409],
    ["STUDIO_REQUIRED", 409],
  ])("maps %s to %i", async (code, status) => {
    admin({ data: null, error: { message: `P0001: ${code}` } });
    expect(await readJson(await POST(request({ token: "t" })))).toEqual({ status, body: { error: code } });
  });

  it("hides unknown database errors behind INVITE_FAILED", async () => {
    admin({ data: null, error: { message: "deadlock detected" } });
    expect(await readJson(await POST(request({ token: "t" })))).toEqual({ status: 503, body: { error: "INVITE_FAILED" } });
  });

  it("returns 503 without an admin client", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await POST(request({ token: "t" }))).status).toBe(503);
  });
});
