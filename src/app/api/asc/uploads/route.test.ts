import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const KEY = "22222222-2222-4222-8222-222222222222";
const EXPORT_ID = "11111111-1111-4111-8111-111111111111";
const BODY = { exportId: EXPORT_ID, appId: "app-1", versionId: "ver-1", localizationId: "loc-1" };

function session(plan = "indie", role = "member") {
  vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
    user: { id: "user-1" },
    from: (table) => createQueryBuilder(table === "workspace_members"
      ? { data: { workspace_id: "ws-1", role }, error: null }
      : { data: { id: "ws-1", plan: "free", manual_plan: plan, free_exports_used: 0 }, error: null }),
  }) as never);
}

function admin({ connected = true, include69 = true, createdAt = new Date().toISOString() } = {}) {
  const rpc = vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>>(async () => ({ data: "job-1", error: null }));
  vi.mocked(createAdminSupabase).mockReturnValue({
    from: (table: string) => createQueryBuilder(table === "asc_connections"
      ? { data: connected ? { id: "c-1" } : null, error: null }
      : { data: { include_69: include69, storage_path: "user-1/x.zip", created_at: createdAt }, error: null }),
    rpc,
  } as never);
  return rpc;
}

const post = (body: unknown = BODY, key: string | null = KEY) => POST(new Request("http://localhost/api/asc/uploads", {
  method: "POST", body: JSON.stringify(body), headers: key ? { "Idempotency-Key": key } : {},
}));

beforeEach(() => { vi.stubEnv("ASC_CONNECTOR_ENABLED", "true"); vi.stubEnv("RENDER_QUEUE_ENABLED", "true"); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("POST /api/asc/uploads", () => {
  it("is hidden behind the flag and limited to paid workspaces", async () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "");
    expect((await post()).status).toBe(404);
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
    session("free");
    admin();
    expect(await readJson(await post())).toEqual({ status: 403, body: { error: "PAID_PLAN_REQUIRED" } });
  });

  it("needs an idempotency key, a connection and a live export", async () => {
    session();
    admin();
    vi.stubEnv("RENDER_QUEUE_ENABLED", "false");
    expect(await readJson(await post())).toEqual({ status: 503, body: { error: "QUEUE_DISABLED" } });
    vi.stubEnv("RENDER_QUEUE_ENABLED", "true");
    expect((await post(BODY, null)).status).toBe(400);
    admin({ connected: false });
    expect(await readJson(await post())).toEqual({ status: 409, body: { error: "ASC_NOT_CONNECTED" } });
    admin({ createdAt: new Date(Date.now() - 25 * 3_600_000).toISOString() });
    expect(await readJson(await post())).toEqual({ status: 410, body: { error: "EXPORT_EXPIRED" } });
  });

  it("explains that Duo-only exports have nothing App Store Connect can receive yet", async () => {
    session();
    const rpc = admin({ include69: false });
    expect(await readJson(await post())).toEqual({ status: 409, body: { error: "NOTHING_TO_UPLOAD", skipped: ["duo-outer", "duo-inner"] } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("queues an asc_upload job any paid member can follow through the render status route", async () => {
    session();
    const rpc = admin();
    const { status, body } = await readJson(await post({ ...BODY, replaceExisting: true, targets: [{ slot: "duo-outer", displayType: "X" }] }));
    expect(status).toBe(202);
    expect(body).toEqual({ jobId: "job-1", statusUrl: "/api/render-jobs/job-1", skipped: ["duo-outer", "duo-inner"] });
    expect(rpc).toHaveBeenCalledWith("enqueue_render", {
      p_user: "user-1", p_workspace: "ws-1", p_kind: "asc_upload", p_key: KEY,
      // Client-supplied targets are ignored: the mapping comes from the server config.
      p_payload: { ...BODY, replaceExisting: true, targets: [{ slot: "iphone-69", displayType: "APP_IPHONE_67" }] },
    });
  });

  it("maps queue conflicts like the render routes", async () => {
    session();
    const rpc = admin();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "RENDER_ALREADY_PENDING" } });
    expect(await readJson(await post())).toEqual({ status: 409, body: { error: "RENDER_ALREADY_PENDING" } });
  });
});
