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

async function admin({ createdAt = new Date().toISOString(), connected = true } = {}) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const archive = await zip.generateAsync({ type: "uint8array" });
  const sealed = sealSecret(pem, master, "ws-1");
  const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data: boolean; error: null }>>(async () => ({ data: true, error: null }));
  const client = {
    from: (table: string) => createQueryBuilder(table === "export_sets"
      ? { data: { storage_path: "user-1/x.zip", created_at: createdAt }, error: null }
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
    expect(complete[1]).toMatchObject({ p_job: "job-1", p_lease: "lease-1", p_error: null, p_result: { uploaded: 2, reordered: true, skipped: ["duo-outer", "duo-inner"] } });
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
  });

  it("will not overflow a set that already holds screenshots", async () => {
    const apple = fakeApple({ sets: [{ id: "set-67", displayType: "APP_IPHONE_67" }], existing: { "set-67": Array.from({ length: 9 }, (_, i) => `old-${i}`) } });
    const { client } = await admin();
    const response = await executeAscUpload(client, job(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_SET_FULL" });
    expect(apple.shots.size).toBe(0);
  });

  it("replaces existing screenshots when asked", async () => {
    const apple = fakeApple({ sets: [{ id: "set-67", displayType: "APP_IPHONE_67" }], existing: { "set-67": Array.from({ length: 9 }, (_, i) => `old-${i}`) } });
    const { client } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting: true } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect(apple.calls.filter((call) => call.method === "DELETE")).toHaveLength(9);
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
