import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { composeZipImages } from "@/lib/pipeline/compose";
import { buildZip } from "@/lib/pipeline/zip";
import { duoSpec } from "@/lib/specs";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, readJson } from "@/test/supabase-mock";
import { executeExport } from "./export";
import type { RenderJob } from "./jobs";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/pipeline/compose", () => ({ composeZipImages: vi.fn() }));
vi.mock("@/lib/pipeline/zip", () => ({ buildZip: vi.fn() }));
vi.mock("@/lib/pipeline/clone-hash", () => ({ hashFromBuffer: vi.fn().mockResolvedValue(BigInt(0)) }));

const USER = { id: "user-1" };
const PAYLOAD = { outerPaths: ["user-1/outer.png"], innerPaths: ["user-1/inner.png"], assumeCloneRisk: true };
const JOB: RenderJob = {
  id: "job-1", user_id: "user-1", workspace_id: "ws-1", kind: "export",
  payload: PAYLOAD, reservation_id: "res-1", lease_token: "lease-1",
};
let image: Buffer;
const rpc = vi.fn();

/** Worker mode: the admin client is also the render client, as in the render-worker route. */
function workerClient(workspace: Record<string, unknown>) {
  const zip = Buffer.alloc(64, 1);
  vi.mocked(buildZip).mockResolvedValue(zip);
  return {
    from: (table: string) => createQueryBuilder({
      data: table === "workspace_members" ? { workspace_id: "ws-1", role: "owner" } : workspace, error: null,
    }),
    rpc,
    storage: { from: (bucket: string) => ({
      info: async () => ({ data: { size: bucket === "uploads" ? image.length : zip.length }, error: null }),
      download: async () => ({ data: { size: image.length, arrayBuffer: async () => Uint8Array.from(image).buffer }, error: null }),
      upload: async () => ({ error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: "https://storage.example/app.zip" }, error: null }),
    }) },
  } as unknown as SupabaseClient;
}

function render(body: unknown = PAYLOAD) {
  return new Request("http://localhost/render", { method: "POST", body: JSON.stringify(body) });
}

beforeAll(async () => {
  image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
});

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(composeZipImages).mockReset();
  vi.mocked(composeZipImages).mockResolvedValue({
    images: [
      { spec: duoSpec("duo-outer", "portrait"), index: 0, buffer: image },
      { spec: duoSpec("duo-inner", "portrait"), index: 0, buffer: image },
    ],
    flattenAlpha: false,
    compositionWarnings: [],
  });
});

describe("executeExport for a queued job", () => {
  it("refuses a job whose workspace is no longer the user's active one", async () => {
    const client = workerClient({ id: "ws-1", plan: "free", free_exports_used: 0 });
    vi.mocked(createAdminSupabase).mockReturnValue(client as never);
    const { status, body } = await readJson(await executeExport(render(), client, USER, { ...JOB, workspace_id: "ws-old" }));
    expect(status).toBe(409);
    expect(body.error).toBe("NO_WORKSPACE");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the queued reservation even when the trial is now exhausted and commits through complete_render", async () => {
    const client = workerClient({ id: "ws-1", plan: "free", free_exports_used: 99 });
    vi.mocked(createAdminSupabase).mockReturnValue(client as never);
    const { status, body } = await readJson(await executeExport(render(), client, USER, JOB));
    expect(status).toBe(200);
    expect(body.exportId).toBe("res-1");
    const names = rpc.mock.calls.map(([name]) => name);
    expect(names).toEqual(["complete_render"]);
    expect(rpc).toHaveBeenCalledWith("complete_render", expect.objectContaining({
      p_job: "job-1", p_lease: "lease-1", p_error: null,
      p_result: expect.objectContaining({ exportId: "res-1", url: "https://storage.example/app.zip" }),
      p_export: expect.objectContaining({ filename: "app.zip", image_count: 1, format: "png" }),
    }));
  });

  it("surfaces a lost lease without refunding through finish_export", async () => {
    const client = workerClient({ id: "ws-1", plan: "free", free_exports_used: 0 });
    vi.mocked(createAdminSupabase).mockReturnValue(client as never);
    rpc.mockResolvedValue({ data: null, error: { message: "RENDER_LEASE_LOST" } });
    const { status, body } = await readJson(await executeExport(render(), client, USER, JOB));
    expect(body.error).toBe("RENDER_LEASE_LOST");
    expect(status).toBe(400);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["complete_render"]);
  });
});
