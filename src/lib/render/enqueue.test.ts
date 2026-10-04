import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { enqueueRender } from "./enqueue";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const USER_ID = "user-1";
const KEY = "0f8fad5b-d9cb-469f-a165-70867728950e";
const FREE_WS = { id: "ws-1", plan: "free", free_exports_used: 0 };
const STUDIO_WS = { id: "ws-1", plan: "studio", stripe_subscription_id: "sub_1", subscription_status: "active", free_exports_used: 0 };

function userClient(workspace: Record<string, unknown> = FREE_WS, membership: unknown = { workspace_id: "ws-1", role: "owner" }) {
  return createSupabaseMock({
    user: { id: USER_ID },
    from: (table) => createQueryBuilder(table === "workspace_members" ? { data: membership, error: null } : { data: workspace, error: null }),
  }) as unknown as SupabaseClient;
}

function request(body: unknown, key: string | null = KEY) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key !== null) headers["Idempotency-Key"] = key;
  return new Request("http://localhost/api/export", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const PAIR = { outerPaths: [`${USER_ID}/a.png`], innerPaths: [`${USER_ID}/b.png`] };
const rpc = vi.fn();

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: "job-1", error: null });
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(createAdminSupabase).mockReturnValue({ rpc } as never);
});

describe("enqueueRender", () => {
  it.each([null, "", "not-a-uuid", `${KEY}x`])("requires a UUID idempotency key (%j)", async (key) => {
    const { status, body } = await readJson(await enqueueRender(request(PAIR, key), userClient(), USER_ID, "export"));
    expect(status).toBe(400);
    expect(body.error).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("accepts an upper-case UUID key", async () => {
    const response = await enqueueRender(request(PAIR, KEY.toUpperCase()), userClient(), USER_ID, "export");
    expect(response.status).toBe(202);
  });

  it("rejects malformed JSON as INVALID_REQUEST", async () => {
    const { status, body } = await readJson(await enqueueRender(request("{not json"), userClient(), USER_ID, "export"));
    expect(status).toBe(400);
    expect(body.error).toBe("INVALID_REQUEST");
  });

  it("rejects paths outside the user's folder before touching billing", async () => {
    const { status, body } = await readJson(await enqueueRender(request({ outerPaths: ["someone-else/a.png"] }), userClient(), USER_ID, "export"));
    expect(status).toBe(403);
    expect(body.error).toBe("PATH_FORBIDDEN");
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("rejects an empty render", async () => {
    const { status, body } = await readJson(await enqueueRender(request({}), userClient(), USER_ID, "export"));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_IMAGES");
  });

  it.each([
    { outerPaths: [`${USER_ID}/a.png`, `${USER_ID}/b.png`], innerPaths: [`${USER_ID}/c.png`] },
    { innerPaths: [`${USER_ID}/c.png`] },
  ])("requires complete pairs for a review", async (payload) => {
    const { status, body } = await readJson(await enqueueRender(request(payload), userClient(STUDIO_WS), USER_ID, "review"));
    expect(status).toBe(400);
    expect(body.error).toBe("INVALID_PAIRS");
  });

  it("allows unpaired exports", async () => {
    const response = await enqueueRender(request({ outerPaths: [`${USER_ID}/a.png`] }), userClient(), USER_ID, "export");
    expect(response.status).toBe(202);
  });

  it("treats sameSet reviews as paired", async () => {
    const response = await enqueueRender(request({ outerPaths: [`${USER_ID}/a.png`], sameSet: true }), userClient(STUDIO_WS), USER_ID, "review");
    expect(response.status).toBe(202);
  });

  it("passes billing errors through", async () => {
    const { status, body } = await readJson(await enqueueRender(request(PAIR), userClient(FREE_WS, null), USER_ID, "export"));
    expect(status).toBe(409);
    expect(body.error).toBe("NO_WORKSPACE");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires Studio for reviews", async () => {
    const { status, body } = await readJson(await enqueueRender(request(PAIR), userClient(FREE_WS), USER_ID, "review"));
    expect(status).toBe(403);
    expect(body.error).toBe("STUDIO_REQUIRED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("gates iPhone 6.9 sizes on the plan", async () => {
    const { status, body } = await readJson(await enqueueRender(request({ ...PAIR, include69: true }), userClient(FREE_WS), USER_ID, "export"));
    expect(status).toBe(403);
    expect(body.error).toBe("IPHONE_69_GATED");
    const allowed = await enqueueRender(request({ ...PAIR, include69: true }), userClient(STUDIO_WS), USER_ID, "export");
    expect(allowed.status).toBe(202);
  });

  it("returns 503 without an admin client", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(null);
    const { status, body } = await readJson(await enqueueRender(request(PAIR), userClient(), USER_ID, "export"));
    expect(status).toBe(503);
    expect(body.error).toBe("EXPORT_UNAVAILABLE");
  });

  it("enqueues with the exact RPC arguments and returns 202 with a status URL", async () => {
    const response = await enqueueRender(request(PAIR), userClient(), USER_ID, "export");
    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Retry-After")).toBe("2");
    expect(await response.json()).toEqual({ jobId: "job-1", statusUrl: "/api/render-jobs/job-1" });
    expect(rpc).toHaveBeenCalledWith("enqueue_render", {
      p_user: USER_ID, p_workspace: "ws-1", p_kind: "export", p_key: KEY, p_payload: PAIR,
    });
  });

  it("enqueues reviews with kind=review", async () => {
    await enqueueRender(request(PAIR), userClient(STUDIO_WS), USER_ID, "review");
    expect(rpc).toHaveBeenCalledWith("enqueue_render", expect.objectContaining({ p_kind: "review" }));
  });

  it.each([
    ["TRIAL_EXHAUSTED", 402],
    ["DAILY_LIMIT", 402],
    ["IDEMPOTENCY_CONFLICT", 409],
    ["RENDER_ALREADY_PENDING", 409],
    ["RENDER_BUSY", 503],
  ])("maps the %s RPC exception to HTTP %i", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { message: `ERROR: P0001: ${code}` } });
    const { status, body } = await readJson(await enqueueRender(request(PAIR), userClient(), USER_ID, "export"));
    expect(status).toBe(expected);
    expect(body.error).toBe(code);
  });

  it("hides unknown RPC errors behind EXPORT_UNAVAILABLE", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "duplicate key value violates unique constraint" } });
    const { status, body } = await readJson(await enqueueRender(request(PAIR), userClient(), USER_ID, "export"));
    expect(status).toBe(503);
    expect(body.error).toBe("EXPORT_UNAVAILABLE");
  });

  it("hides unexpected thrown errors behind EXPORT_UNAVAILABLE and logs them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const response = await enqueueRender(request(PAIR), userClient(), USER_ID, "export");
    const text = await response.text();
    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toEqual({ error: "EXPORT_UNAVAILABLE" });
    expect(text).not.toContain("ECONNREFUSED");
    expect(log).toHaveBeenCalledWith("render_enqueue_failed", { message: "connect ECONNREFUSED 10.0.0.5:5432" });
    log.mockRestore();
  });

  it("maps an oversized body to 413 INPUT_TOO_LARGE", async () => {
    const big = JSON.stringify({ appName: "x".repeat(70_000) });
    const { status, body } = await readJson(await enqueueRender(request(big), userClient(), USER_ID, "export"));
    expect(status).toBe(413);
    expect(body.error).toBe("INPUT_TOO_LARGE");
  });
});
