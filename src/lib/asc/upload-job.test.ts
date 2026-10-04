import { generateKeyPairSync, randomBytes } from "node:crypto";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryBuilder } from "@/test/supabase-mock";
import { fakeApple } from "@/test/asc-apple-mock";
import type { RenderJob } from "../render/jobs";
import { sealSecret } from "./crypto";
import { ascTargetsForExport, executeAscUpload, parseAscUploadPayload, planAscFiles, type AscUploadPayload } from "./upload-job";

const master = randomBytes(32);
const pem = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const EXPORT_ID = "11111111-1111-4111-8111-111111111111";
const PAYLOAD: AscUploadPayload = {
  exportId: EXPORT_ID, appId: "app-1", versionId: "ver-1", localizationId: "loc-1", replaceExisting: false,
  targets: [{ slot: "iphone-69", displayType: "APP_IPHONE_67" }],
};
const job = (overrides: Partial<RenderJob> = {}): RenderJob => ({
  id: "job-1", user_id: "user-1", workspace_id: "ws-1", kind: "asc_upload", payload: PAYLOAD,
  reservation_id: null, lease_token: "lease-1", attempts: 1, ...overrides,
});

const files = {
  "harbor/README.txt": "readme",
  "harbor/duo-outer-portrait/01.png": randomBytes(64),
  "harbor/duo-inner-portrait/01.png": randomBytes(64),
  "harbor/iphone-69-portrait/1290x2796/01.png": randomBytes(64),
  "harbor/iphone-69-portrait/1320x2868/02.png": randomBytes(3000),
  "harbor/iphone-69-portrait/1320x2868/01.png": randomBytes(5000),
};

async function admin({ createdAt = new Date().toISOString(), connected = true, role = "owner", plan = "indie", workspaceId = "ws-1" } = {}) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const archive = await zip.generateAsync({ type: "uint8array" });
  const sealed = sealSecret(pem, master, "ws-1");
  const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data: boolean; error: null }>>(async () => ({ data: true, error: null }));
  const client = {
    from: (table: string) => createQueryBuilder(
      table === "workspace_members" ? { data: { workspace_id: workspaceId, role }, error: null }
      : table === "workspaces" ? { data: { id: workspaceId, plan: "free", manual_plan: plan, free_exports_used: 0 }, error: null }
      : table === "export_sets" ? { data: { storage_path: "user-1/x.zip", created_at: createdAt }, error: null }
      : { data: connected ? { issuer_id: "57246542-96fe-1a63-e053-0824d011072a", key_id: "2X9R4HXF34", encrypted_private_key: sealed.ciphertext, iv: sealed.iv, auth_tag: sealed.authTag } : null, error: null }),
    storage: { from: () => ({ download: async () => ({ data: new Blob([archive as BlobPart]), error: null }) }) },
    rpc,
  };
  return { client: client as never, rpc };
}
const instant = async () => {};
const progressCalls = (rpc: ReturnType<typeof vi.fn>) => rpc.mock.calls.filter(([name]) => name === "report_render_progress").map(([, args]) => (args as { p_progress: { files: { state: string }[] } }).p_progress);

beforeEach(() => vi.stubEnv("ASC_ENCRYPTION_KEY", master.toString("base64")));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("App Store Connect upload planning", () => {
  it("maps no Duo slot until Apple ships a display type, and 6.9\" to APP_IPHONE_67", () => {
    expect(ascTargetsForExport(false)).toEqual({ targets: [], skipped: ["duo-outer", "duo-inner"] });
    expect(ascTargetsForExport(true).targets).toEqual([{ slot: "iphone-69", displayType: "APP_IPHONE_67" }]);
  });

  it("keeps only the largest 6.9\" size, in slide order, with or without a client folder", () => {
    expect(planAscFiles(Object.keys(files), PAYLOAD.targets).map((file) => [file.path, file.fileName])).toEqual([
      ["harbor/iphone-69-portrait/1320x2868/01.png", "duoshot-iphone-69-portrait-01.png"],
      ["harbor/iphone-69-portrait/1320x2868/02.png", "duoshot-iphone-69-portrait-02.png"],
    ]);
    const studio = ["client/harbor/iphone-69-landscape/2868x1320/01.jpg", "client/harbor/iphone-69-landscape/2796x1290/01.jpg"];
    expect(planAscFiles(studio, PAYLOAD.targets).map((file) => file.fileName)).toEqual(["duoshot-iphone-69-landscape-01.jpg"]);
  });

  it("rejects payloads whose display mapping differs from the server config", () => {
    expect(() => parseAscUploadPayload({ ...PAYLOAD, targets: [{ slot: "duo-outer", displayType: "APP_IPHONE_67" }] })).toThrow("INVALID_REQUEST");
    expect(() => parseAscUploadPayload({ ...PAYLOAD, appId: "../x" })).toThrow("INVALID_REQUEST");
    expect(parseAscUploadPayload(PAYLOAD)).toEqual(PAYLOAD);
  });
});

describe("asc_upload job", () => {
  it("uploads the export's 6.9\" files, reports per-file progress and commits the result", async () => {
    const apple = fakeApple({ parts: 2, states: ["UPLOAD_COMPLETE", "COMPLETE"] });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, job(), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    const shots = [...apple.shots.entries()];
    expect(shots.map(([, shot]) => shot.fileName)).toEqual(["duoshot-iphone-69-portrait-01.png", "duoshot-iphone-69-portrait-02.png"]);
    expect(apple.assembled(shots[0]![0]).equals(files["harbor/iphone-69-portrait/1320x2868/01.png"])).toBe(true);
    expect(apple.sets).toEqual([{ id: expect.any(String), displayType: "APP_IPHONE_67" }]);
    const reports = progressCalls(rpc);
    expect(reports[0]!.files.map((file) => file.state)).toEqual(["pending", "pending"]);
    expect(reports.at(-1)).toMatchObject({ total: 2, done: 2, files: [{ state: "complete" }, { state: "complete" }] });
    const complete = rpc.mock.calls.find(([name]) => name === "complete_render")!;
    expect(complete[1]).toMatchObject({ p_job: "job-1", p_lease: "lease-1", p_error: undefined, p_result: { uploaded: 2, reordered: true, skipped: ["duo-outer", "duo-inner"] } });
    expect(apple.calls.some((call) => call.url.includes("/relationships/appScreenshots"))).toBe(true);
  });

  it("refuses a reclaimed attempt instead of duplicating screenshots", async () => {
    const apple = fakeApple();
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, job({ attempts: 2 }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_RETRY_UNSAFE" });
    expect(apple.calls).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails with ASC_PROCESSING_FAILED and keeps the per-file states", async () => {
    const apple = fakeApple({ states: ["FAILED"] });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, job(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_FAILED" });
    expect(progressCalls(rpc).at(-1)!.files).toEqual([
      expect.objectContaining({ state: "failed", error: "ASC_PROCESSING_FAILED" }),
      expect.objectContaining({ state: "failed", error: "ASC_PROCESSING_FAILED" }),
    ]);
    expect(rpc.mock.calls.some(([name]) => name === "complete_render")).toBe(false);
    // Apple requires FAILED assets to be deleted before retrying.
    expect(apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname))
      .toEqual([...apple.shots.keys()].map((id) => `/v1/appScreenshots/${id}`));
  });

  it("removes the job's own reservations when a later file fails, so a retry starts clean", async () => {
    let commits = 0;
    const apple = fakeApple({ fail: (method, path) => method === "PATCH" && path.startsWith("/v1/appScreenshots/") && ++commits === 2 ? { status: 422, code: "ENTITY_ERROR" } : null });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, job(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_INVALID" });
    const created = [...apple.shots.keys()];
    expect(created).toHaveLength(2);
    expect(apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname))
      .toEqual(created.map((id) => `/v1/appScreenshots/${id}`));
    expect(progressCalls(rpc).at(-1)!.files).toEqual([
      expect.objectContaining({ state: "failed", error: "ASC_ROLLED_BACK" }),
      expect.objectContaining({ state: "failed", error: "ASC_INVALID" }),
    ]);
  });

  it.each([false, true])("checks set capacity before touching anything (replaceExisting: %s)", async (replaceExisting) => {
    const apple = fakeApple({ sets: [{ id: "set-67", displayType: "APP_IPHONE_67" }], existing: { "set-67": Array.from({ length: 9 }, (_, i) => `old-${i}`) } });
    const { client } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_SET_FULL" });
    // Read-only calls only: nothing reserved, created or deleted.
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
    expect(apple.existing["set-67"]).toHaveLength(9);
  });

  it("replaces only after the new screenshots are live, then orders the new set", async () => {
    const previous = Array.from({ length: 8 }, (_, i) => `old-${i}`);
    const apple = fakeApple({ sets: [{ id: "set-67", displayType: "APP_IPHONE_67" }], existing: { "set-67": [...previous] } });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting: true } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    const methods = apple.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`);
    const firstDelete = methods.findIndex((call) => call.startsWith("DELETE"));
    const lastPoll = methods.findLastIndex((call) => /^GET \/v1\/appScreenshots\/shot-/.test(call));
    expect(firstDelete).toBeGreaterThan(lastPoll);
    expect(methods.filter((call) => call.startsWith("DELETE"))).toEqual(previous.map((id) => `DELETE /v1/appScreenshots/${id}`));
    const uploaded = [...apple.shots.keys()];
    expect(apple.calls.at(-1)).toMatchObject({ method: "PATCH", body: { data: uploaded.map((id) => ({ type: "appScreenshots", id })) } });
    expect(rpc.mock.calls.find(([name]) => name === "complete_render")![1]).toMatchObject({ p_result: { uploaded: 2, replaced: 8 } });
  });

  it("keeps the previous screenshots when a replacing upload fails", async () => {
    const apple = fakeApple({ states: ["FAILED"], sets: [{ id: "set-67", displayType: "APP_IPHONE_67" }], existing: { "set-67": ["old-1", "old-2"] } });
    const { client } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting: true } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_FAILED" });
    const deleted = apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname);
    expect(deleted).toEqual([...apple.shots.keys()].map((id) => `/v1/appScreenshots/${id}`));
    expect(apple.existing["set-67"]).toEqual(["old-1", "old-2"]);
  });

  it("still rolls back after the heartbeat aborted the job", async () => {
    const controller = new AbortController();
    const apple = fakeApple();
    let commits = 0;
    const aborting: typeof fetch = async (input, init) => {
      const response = await apple.fetch(input, init);
      // The lease is lost right after the first file is committed.
      if (init?.method === "PATCH" && ++commits === 1) controller.abort();
      return response;
    };
    const { client } = await admin();
    const response = await executeAscUpload(client, job(), { fetch: aborting, sleep: instant, signal: controller.signal });
    expect(await response.json()).toEqual({ error: "ASC_ABORTED" });
    const created = [...apple.shots.keys()];
    expect(created).toHaveLength(1);
    expect(apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname)).toEqual([`/v1/appScreenshots/${created[0]}`]);
  });

  it("re-checks membership, plan and role when the job runs", async () => {
    const apple = fakeApple();
    const unpaid = await admin({ plan: "free" });
    expect(await (await executeAscUpload(unpaid.client, job(), { fetch: apple.fetch })).json()).toEqual({ error: "PAID_PLAN_REQUIRED" });
    const moved = await admin({ workspaceId: "ws-2" });
    expect(await (await executeAscUpload(moved.client, job(), { fetch: apple.fetch })).json()).toEqual({ error: "NO_WORKSPACE" });
    const member = await admin({ role: "member" });
    expect(await (await executeAscUpload(member.client, job({ payload: { ...PAYLOAD, replaceExisting: true } }), { fetch: apple.fetch })).json()).toEqual({ error: "OWNER_REQUIRED" });
    expect(apple.calls).toHaveLength(0);
  });

  it("stops on an expired export or a revoked connection before calling Apple", async () => {
    const apple = fakeApple();
    const expired = await admin({ createdAt: new Date(Date.now() - 25 * 3_600_000).toISOString() });
    expect(await (await executeAscUpload(expired.client, job(), { fetch: apple.fetch })).json()).toEqual({ error: "EXPORT_EXPIRED" });
    const revoked = await admin({ connected: false });
    expect(await (await executeAscUpload(revoked.client, job(), { fetch: apple.fetch })).json()).toEqual({ error: "ASC_NOT_CONNECTED" });
    expect(apple.calls).toHaveLength(0);
  });
});
