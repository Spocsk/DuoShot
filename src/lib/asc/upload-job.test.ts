import { generateKeyPairSync, randomBytes } from "node:crypto";
import JSZip from "jszip";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryBuilder } from "@/test/supabase-mock";
import { fakeApple } from "@/test/asc-apple-mock";
import { fakeAssetLibraryApple } from "@/test/asc-asset-library-mock";
import { refDataFixture } from "@/test/fixtures/asc-asset-library/fixtures";
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

async function admin({ createdAt = new Date().toISOString(), connected = true, role = "owner", plan = "indie", workspaceId = "ws-1", duoOrder = undefined as string[] | undefined, manifest = undefined as unknown, rawDuoCount = 1, zipFiles = files } = {}) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(zipFiles)) zip.file(path, content);
  for (let index = 2; index <= rawDuoCount; index++) {
    for (const side of ["outer", "inner"]) zip.file(`harbor/duo-${side}-portrait/${String(index).padStart(2, "0")}.png`, files[`harbor/duo-${side}-portrait/01.png` as keyof typeof files]);
  }
  if (duoOrder) zip.file("harbor/duo-slot.json", JSON.stringify({ displayType: "APP_IPHONE_DUO", files: duoOrder }));
  if (manifest !== undefined) zip.file("harbor/duo-slot.json", JSON.stringify(manifest));
  const archive = await zip.generateAsync({ type: "uint8array" });
  const sealed = sealSecret(pem, master, "ws-1");
  const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data: boolean; error: { message: string } | null }>>(async () => ({ data: true, error: null }));
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

beforeAll(async () => {
  files["harbor/duo-outer-portrait/01.png"] = await screenshot(1398, 2034);
  files["harbor/duo-inner-portrait/01.png"] = await screenshot(2007, 2853);
});

function screenshot(width: number, height: number, format: "png" | "jpeg" | "webp" = "png") {
  return sharp({ create: { width, height, channels: 3, background: "red" } }).toFormat(format).toBuffer();
}

beforeEach(() => vi.stubEnv("ASC_ENCRYPTION_KEY", master.toString("base64")));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("App Store Connect upload planning", () => {
  it("maps both Duo screen sizes to one APP_IPHONE_DUO display type", () => {
    expect(ascTargetsForExport(false)).toEqual({ targets: [
      { slot: "duo-outer", displayType: "APP_IPHONE_DUO" },
      { slot: "duo-inner", displayType: "APP_IPHONE_DUO" },
    ], skipped: [] });
    expect(ascTargetsForExport(true).targets.at(-1)).toEqual({ slot: "iphone-69", displayType: "APP_IPHONE_67" });
  });

  it("rejects legacy raw sets over ten rather than trimming each side", () => {
    const paths = Array.from({ length: 6 }, (_, index) => String(index + 1).padStart(2, "0")).flatMap((index) => [
      `app/duo-outer-portrait/${index}.png`, `app/duo-inner-portrait/${index}.png`,
    ]);
    expect(() => planAscFiles(paths, ascTargetsForExport(false).targets)).toThrow("DUO_SLOT_LIMIT");
    expect(planAscFiles(paths.slice(0, 10), ascTargetsForExport(false).targets)).toHaveLength(10);
  });

  it("honors selected mix order from the ZIP manifest", () => {
    const paths = ["app/duo-outer-landscape/03.jpg", "app/duo-inner-landscape/01.jpg"];
    expect(planAscFiles(paths, ascTargetsForExport(false).targets, [...paths].reverse()).map((file) => file.path)).toEqual([...paths].reverse());
  });

  it("does not mistake app or client names for screenshot folders", () => {
    const paths = [
      "duo-outer-portrait/duo-inner-landscape/duo-outer-portrait/01.png",
      "duo-outer-portrait/duo-inner-landscape/duo-inner-portrait/02.png",
      "duo-outer-portrait/duo-inner-landscape/iphone-69-portrait/1320x2868/01.png",
    ];
    expect(planAscFiles(paths, ascTargetsForExport(true).targets, paths.slice(0, 2)).map((file) => file.path)).toEqual(paths);
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

describe("asc_upload job with App Asset Library", () => {
  beforeEach(() => vi.stubEnv("ASC_UPLOAD_MODEL", "asset-library"));
  const duoPayload = { ...PAYLOAD, targets: ascTargetsForExport(false).targets };
  const duoJob = (replaceExisting = false) => job({ payload: { ...duoPayload, replaceExisting } });
  const paths = (apple: ReturnType<typeof fakeAssetLibraryApple>, method: string) =>
    apple.calls.filter((call) => call.method === method).map((call) => new URL(call.url).pathname);

  it.each([false, true])("follows a renamed Duo group and manifest order, reporting the same result shape (replace: %s)", async (replaceExisting) => {
    const group = "RENAMED_DUO_GROUP";
    const previous = ["old-a", "old-b"];
    const apple = fakeAssetLibraryApple({ refData: refDataFixture(group), existing: { [group]: previous }, states: ["PREPARE_FOR_SUBMISSION"] });
    const { client, rpc } = await admin({ duoOrder: ["harbor/duo-inner-portrait/01.png", "harbor/duo-outer-portrait/01.png"] });
    const response = await executeAscUpload(client, duoJob(replaceExisting), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ appId: "app-1", versionId: "ver-1", localizationId: "loc-1", uploaded: 2, replaced: replaceExisting ? 2 : 0, reordered: true, skipped: [] });
    expect([...apple.images.values()].map((image) => image.fileName)).toEqual(["duoshot-duo-inner-portrait-01.png", "duoshot-duo-outer-portrait-01.png"]);
    const placements = [...apple.placements].filter(([, placement]) => placement.imageId).map(([id]) => id);
    expect(apple.calls.filter((call) => new URL(call.url).pathname === "/v1/appAssetLibraryPlacements"))
      .toHaveLength(2);
    const orders = apple.calls.filter((call) => new URL(call.url).pathname === "/v1/appAssetLibraryPlacementOrderingRequests");
    expect(orders).toHaveLength(1);
    expect(orders[0]!.body).toEqual({ data: {
      type: "appAssetLibraryPlacementOrderingRequests", attributes: { placementGroup: group }, relationships: {
        orderedPlacements: { data: (replaceExisting ? [...placements, ...previous] : [...previous, ...placements]).map((id) => ({ type: "appAssetLibraryPlacements", id })) },
        appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: "loc-1" } },
      },
    } });
    expect(paths(apple, "DELETE")).toEqual(replaceExisting ? previous.map((id) => `/v1/appAssetLibraryPlacements/${id}`) : []);
    if (replaceExisting) {
      expect(apple.calls.findIndex((call) => call.method === "DELETE")).toBeGreaterThan(apple.calls.indexOf(orders[0]!));
    }
    expect(apple.calls.some((call) => /appScreenshot/.test(call.url))).toBe(false);
    for (const call of apple.calls.filter((call) => call.method === "PATCH")) {
      expect(call.body).toMatchObject({ data: { attributes: { uploaded: true } } });
      expect(JSON.stringify(call.body)).not.toContain("sourceFileChecksum");
    }
    for (const call of apple.calls.filter((call) => call.method === "PUT")) {
      expect(call.headers).toEqual({ "content-type": "image/png" });
    }
    expect(progressCalls(rpc)[0]).toMatchObject({ total: 2, done: 0, files: [{ state: "pending" }, { state: "pending" }] });
    expect(progressCalls(rpc).at(-1)).toMatchObject({ total: 2, done: 2, files: [{ state: "complete" }, { state: "complete" }] });
    expect(rpc.mock.calls.find(([name]) => name === "complete_render")![1]).toMatchObject({ p_result: { uploaded: 2, reordered: true } });
  });

  it.each(["APPROVED", "REJECTED", "DEVELOPER_REJECTED", "READY_FOR_REVIEW"])("refuses version state %s before any write", async (versionState) => {
    const apple = fakeAssetLibraryApple({ versionState });
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(true), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_VERSION_NOT_EDITABLE" });
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
    expect(apple.images.size).toBe(0);
  });

  it("refuses a selection above the refData limit without truncating it", async () => {
    const apple = fakeAssetLibraryApple({ refData: refDataFixture("SMALL_DUO", 1) });
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "DUO_SLOT_LIMIT" });
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
  });

  it.each(["missing-limit", "unavailable-refdata"])("falls back to DUO_SLOT_MAX for %s", async (kind) => {
    const apple = fakeAssetLibraryApple({ refData: refDataFixture("DUO_NO_LIMIT", null),
      fail: (method, path) => kind === "unavailable-refdata" && method === "GET" && path === "/v1/appAssetLibraryRefData" ? { status: 503, code: "UNAVAILABLE" } : null });
    const { client } = await admin({ rawDuoCount: 6 });
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "DUO_SLOT_LIMIT" });
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
  });

  it("uses a refData limit above the local default without truncating a raw ZIP", async () => {
    const apple = fakeAssetLibraryApple({ refData: refDataFixture("LARGER_DUO", 12), states: ["COMPLETE"] });
    const { client } = await admin({ rawDuoCount: 6 });
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ uploaded: 12 });
    expect(apple.images.size).toBe(12);
  });

  it.each([false, true])("checks existing plus new placements before writing (replace: %s)", async (replaceExisting) => {
    const group = "LIMITED_DUO";
    const apple = fakeAssetLibraryApple({ refData: refDataFixture(group, 3), existing: { [group]: ["old-a", "old-b"] }, pageSize: 1 });
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(replaceExisting), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_SET_FULL" });
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
    expect([...apple.placements.values()].every((placement) => !placement.deleted)).toBe(true);
  });

  it("rolls back every reserved image on a later spec mismatch and keeps readable server diagnostics", async () => {
    const refData = refDataFixture();
    const apple = fakeAssetLibraryApple({ refData, states: ["PREPARE_FOR_SUBMISSION"],
      processedSpecId: () => refData.imageSpecs![0]!.specId });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, duoJob(true), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_SPEC_MISMATCH" });
    expect(log).toHaveBeenCalledWith("asc_asset_library_failed", expect.objectContaining({ code: "ASC_SPEC_MISMATCH",
      message: expect.stringMatching(/attendue.*i2007x2853a0.*écran interne.*reçue.*i1398x2034a0.*écran externe/) }));
    expect(apple.placements.size).toBe(0);
    expect(apple.images.size).toBe(2);
    expect([...apple.images.values()].every((image) => image.deleted)).toBe(true);
    expect(progressCalls(rpc).at(-1)!.files).toEqual([
      expect.objectContaining({ state: "failed", error: "ASC_ROLLED_BACK" }),
      expect.objectContaining({ state: "failed", error: "ASC_SPEC_MISMATCH" }),
    ]);
    expect(rpc.mock.calls.some(([name]) => name === "complete_render")).toBe(false);
  });

  it.each([["STATE_ERROR.INVALID_STATE", "ASC_VERSION_NOT_EDITABLE"], ["ENTITY_ERROR.ATTRIBUTE.INVALID", "ASC_PLACEMENT_INVALID"]])("rolls back placements before images on a later placement 409 %s", async (appleCode, code) => {
    let creates = 0;
    const apple = fakeAssetLibraryApple({ existing: { IPHONE_DUO_PROFILE: ["old-a"] }, states: ["COMPLETE"],
      fail: (method, path) => method === "POST" && path === "/v1/appAssetLibraryPlacements" && ++creates === 2 ? { status: 409, code: appleCode } : null });
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(true), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: code });
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryPlacements/placement-1", "/v1/appAssetLibraryImages/image-1", "/v1/appAssetLibraryImages/image-2"]);
    expect(apple.placements.get("old-a")!.deleted).toBe(false);
    expect([...apple.images.values()].every((image) => image.deleted)).toBe(true);
  });

  it("rejects an image with an alpha channel before reserving anything", async () => {
    const alpha = await sharp({ create: { width: 1398, height: 2034, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 0.5 } } }).png().toBuffer();
    const apple = fakeAssetLibraryApple({ states: ["COMPLETE"] });
    const { client } = await admin({ zipFiles: { ...files, "harbor/duo-outer-portrait/01.png": alpha } });
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_INVALID" });
    expect(paths(apple, "POST")).not.toContain("/v1/appAssetLibraryImages");
    expect(apple.images.size).toBe(0);
  });

  it("keeps previous placements and rolls back the whole job if ordering fails", async () => {
    const apple = fakeAssetLibraryApple({ existing: { IPHONE_DUO_PROFILE: ["old-a"] }, states: ["COMPLETE"],
      fail: (method, path) => method === "POST" && path === "/v1/appAssetLibraryPlacementOrderingRequests" ? { status: 422, code: "ENTITY_ERROR" } : null });
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(true), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_INVALID" });
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryPlacements/placement-1", "/v1/appAssetLibraryPlacements/placement-2", "/v1/appAssetLibraryImages/image-1", "/v1/appAssetLibraryImages/image-2"]);
    expect(apple.placements.get("old-a")!.deleted).toBe(false);
  });

  it("discovers the 6.9-inch group from actual pixels and orders each group separately", async () => {
    const zipFiles = { ...files, "harbor/iphone-69-portrait/1320x2868/01.png": await screenshot(1320, 2868),
      "harbor/iphone-69-portrait/1320x2868/02.png": await screenshot(1320, 2868) };
    const refData = refDataFixture();
    const phoneGroup = "RENAMED_69_GROUP";
    refData.placementProfileGroups![1]!.placementProfileGroupId = phoneGroup;
    refData.placementTypes![0]!.specMappings![1]!.placementGroupId = phoneGroup;
    refData.features![0]!.placementPolicies![0]!.groupLimits![0]!.groupIds = ["IPHONE_DUO_PROFILE", phoneGroup];
    const apple = fakeAssetLibraryApple({ refData, states: ["COMPLETE"] });
    const { client } = await admin({ zipFiles });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(true).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ uploaded: 4 });
    const orders = apple.calls.filter((call) => new URL(call.url).pathname === "/v1/appAssetLibraryPlacementOrderingRequests");
    expect(orders.map((call) => call.body)).toEqual(["IPHONE_DUO_PROFILE", phoneGroup].map((group, index) => ({ data: {
      type: "appAssetLibraryPlacementOrderingRequests", attributes: { placementGroup: group }, relationships: {
        orderedPlacements: { data: [1, 2].map((n) => ({ type: "appAssetLibraryPlacements", id: `placement-${index * 2 + n}` })) },
        appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: "loc-1" } },
      },
    } })));
  });

  it.each(["response", "exception", "lease-lost"])("keeps finalized replacements if recording the result fails (%s)", async (failure) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const apple = fakeAssetLibraryApple({ existing: { IPHONE_DUO_PROFILE: ["old-a"] }, states: ["COMPLETE"] });
    const { client, rpc } = await admin();
    rpc.mockImplementation(async (name) => {
      if (name === "complete_render") {
        if (failure === "exception") throw new Error("database unavailable");
        return { data: false, error: { message: failure === "lease-lost" ? "RENDER_LEASE_LOST" : "database unavailable" } };
      }
      return { data: true, error: null };
    });
    const response = await executeAscUpload(client, duoJob(true), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: failure === "lease-lost" ? "RENDER_LEASE_LOST" : "ASC_RETRY_UNSAFE" });
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryPlacements/old-a"]);
    expect([...apple.images.values()].every((image) => !image.deleted)).toBe(true);
  });

  it("preserves replacements if deleting an old placement fails", async () => {
    const apple = fakeAssetLibraryApple({ existing: { IPHONE_DUO_PROFILE: ["old-a", "old-b"] }, states: ["COMPLETE"],
      fail: (method, path) => method === "DELETE" && path.endsWith("/old-b") ? { status: 409, code: "STATE_ERROR.INVALID_STATE" } : null });
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(true), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toMatchObject({ uploaded: 2, replaced: 1, reordered: false });
    expect([...apple.images.values()].every((image) => !image.deleted)).toBe(true);
    expect(apple.placements.get("old-a")!.deleted).toBe(true);
    expect(apple.placements.get("old-b")!.deleted).toBe(false);
  });

  it("marks a rejected reservation as failed even though no image id was returned", async () => {
    const apple = fakeAssetLibraryApple({ fail: (method, path) => method === "POST" && path === "/v1/appAssetLibraryImages" ? { status: 403, code: "FORBIDDEN" } : null });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_FORBIDDEN" });
    expect(progressCalls(rpc).at(-1)!.files[0]).toMatchObject({ state: "failed", error: "ASC_FORBIDDEN" });
    expect(apple.images.size).toBe(0);
    expect(paths(apple, "DELETE")).toEqual([]);
  });

  it("rolls back timed out processing within the job budget", async () => {
    let now = Date.now();
    const apple = fakeAssetLibraryApple({ states: ["UPLOAD_COMPLETE"] });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, now: () => now, sleep: async (ms) => { now += ms; }, budgetMs: 5000 });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_TIMEOUT" });
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryImages/image-1"]);
    expect(progressCalls(rpc).at(-1)!.files[0]).toMatchObject({ state: "failed", error: "ASC_PROCESSING_TIMEOUT" });
  });

  it.each(["PREPARE_FOR_SUBMISSION", "COMPLETE"])("rolls back all reservations without placements when the last %s GET crosses the deadline", async (state) => {
    let now = Date.now();
    const apple = fakeAssetLibraryApple({ states: [state] });
    const { client, rpc } = await admin();
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const response = await executeAscUpload(client, duoJob(), { budgetMs: 1000, now: () => now, sleep: instant,
      fetch: async (input, init) => {
        const response = await apple.fetch(input, init);
        if (init?.method === "GET" && new URL(String(input)).pathname === "/v1/appAssetLibraryImages/image-2") now += 2000;
        return response;
      } });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_TIMEOUT" });
    expect(apple.images.size).toBe(2);
    expect([...apple.images.values()].every((image) => image.deleted)).toBe(true);
    expect(apple.placements.size).toBe(0);
    expect(paths(apple, "POST")).toEqual(["/v1/appAssetLibraryImages", "/v1/appAssetLibraryImages"]);
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryImages/image-1", "/v1/appAssetLibraryImages/image-2"]);
    expect(progressCalls(rpc).at(-1)!.files).toEqual([
      expect.objectContaining({ state: "failed", error: "ASC_ROLLED_BACK" }),
      expect.objectContaining({ state: "failed", error: "ASC_PROCESSING_TIMEOUT" }),
    ]);
    expect(rpc.mock.calls.some(([name]) => name === "complete_render")).toBe(false);
    // Cleanup has its own timeout even after the main deadline has expired.
    expect(timeout.mock.calls.slice(-2).map(([ms]) => ms)).toEqual([10_000, 10_000]);
    expect(timeout.mock.calls.slice(0, -2).every(([ms]) => ms <= 1000)).toBe(true);
  });

  it.each(["reservation", "transfer", "commit", "placement", "order"])("stops subsequent writes and cleans known ids after a late %s response", async (phase) => {
    let now = Date.now();
    let placements = 0;
    const apple = fakeAssetLibraryApple({ states: ["COMPLETE"], parts: 1, existing: { IPHONE_DUO_PROFILE: ["old-a"] } });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, duoJob(true), { budgetMs: 1000, now: () => now, sleep: instant,
      fetch: async (input, init) => {
        const response = await apple.fetch(input, init);
        const path = new URL(String(input)).pathname;
        if ((phase === "reservation" && init?.method === "POST" && path === "/v1/appAssetLibraryImages") ||
          (phase === "transfer" && init?.method === "PUT") ||
          (phase === "commit" && init?.method === "PATCH") ||
          (phase === "placement" && init?.method === "POST" && path === "/v1/appAssetLibraryPlacements" && ++placements === 1) ||
          (phase === "order" && path === "/v1/appAssetLibraryPlacementOrderingRequests")) now += 2000;
        return response;
      } });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_TIMEOUT" });
    const placementCount = phase === "placement" ? 1 : phase === "order" ? 2 : 0;
    const imageCount = placementCount ? 2 : 1;
    expect(apple.images.size).toBe(imageCount);
    expect(paths(apple, "DELETE")).toEqual([
      ...Array.from({ length: placementCount }, (_, i) => `/v1/appAssetLibraryPlacements/placement-${i + 1}`),
      ...Array.from({ length: imageCount }, (_, i) => `/v1/appAssetLibraryImages/image-${i + 1}`),
    ]);
    expect(apple.placements.get("old-a")!.deleted).toBe(false);
    const firstDelete = apple.calls.findIndex((call) => call.method === "DELETE");
    expect(apple.calls.slice(firstDelete).every((call) => call.method === "DELETE")).toBe(true);
    expect(paths(apple, "POST").filter((path) => path === "/v1/appAssetLibraryPlacementOrderingRequests")).toHaveLength(phase === "order" ? 1 : 0);
    expect(rpc.mock.calls.some(([name]) => name === "complete_render")).toBe(false);
  });

  it("does not reserve an image after the job budget has expired", async () => {
    const apple = fakeAssetLibraryApple();
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant, budgetMs: 0 });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_TIMEOUT" });
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
  });

  it("keeps FAILED stateDetails on the server and deletes the failed image", async () => {
    const apple = fakeAssetLibraryApple({ states: ["FAILED"] });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_PROCESSING_FAILED" });
    expect(log).toHaveBeenCalledWith("asc_asset_library_failed", expect.objectContaining({ stateDetails: [{ code: "INVALID_IMAGE", message: "Processing failed in memory" }] }));
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryImages/image-1"]);
  });

  it("continues cleanup of other images when a placement cannot be deleted", async () => {
    let creates = 0;
    const apple = fakeAssetLibraryApple({ states: ["COMPLETE"], fail: (method, path) => {
      if (method === "POST" && path === "/v1/appAssetLibraryPlacements" && ++creates === 2) return { status: 409, code: "STATE_ERROR.INVALID_STATE" };
      if (method === "DELETE" && path === "/v1/appAssetLibraryPlacements/placement-1") return { status: 403, code: "FORBIDDEN" };
      return null;
    } });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_VERSION_NOT_EDITABLE" });
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryPlacements/placement-1", "/v1/appAssetLibraryImages/image-1", "/v1/appAssetLibraryImages/image-2"]);
    expect(progressCalls(rpc).at(-1)!.files[0]).toMatchObject({ state: "failed", error: "ASC_CLEANUP_FAILED" });
    expect(apple.images.get("image-1")!.deleted).toBe(false);
    expect(apple.images.get("image-2")!.deleted).toBe(true);
  });

  it("rolls back all groups when ordering the last group fails", async () => {
    const zipFiles = { ...files, "harbor/iphone-69-portrait/1320x2868/01.png": await screenshot(1320, 2868),
      "harbor/iphone-69-portrait/1320x2868/02.png": await screenshot(1320, 2868) };
    let orders = 0;
    const apple = fakeAssetLibraryApple({ states: ["COMPLETE"], existing: { IPHONE_DUO_PROFILE: ["old-duo"], IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE: ["old-phone"] },
      fail: (method, path) => method === "POST" && path === "/v1/appAssetLibraryPlacementOrderingRequests" && ++orders === 2 ? { status: 422, code: "INVALID_ORDER" } : null });
    const { client } = await admin({ zipFiles });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting: true, targets: ascTargetsForExport(true).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_INVALID" });
    expect(paths(apple, "DELETE")).toEqual([
      ...[1, 2, 3, 4].map((id) => `/v1/appAssetLibraryPlacements/placement-${id}`),
      ...[1, 2, 3, 4].map((id) => `/v1/appAssetLibraryImages/image-${id}`),
    ]);
    expect(apple.placements.get("old-duo")!.deleted).toBe(false);
    expect(apple.placements.get("old-phone")!.deleted).toBe(false);
    expect([...apple.images.values()].every((image) => image.deleted)).toBe(true);
  });

  it("rolls back with a separate signal after cancellation during placement creation", async () => {
    const controller = new AbortController();
    const apple = fakeAssetLibraryApple({ states: ["COMPLETE"] });
    const aborting: typeof fetch = async (input, init) => {
      const response = await apple.fetch(input, init);
      if (init?.method === "POST" && new URL(String(input)).pathname === "/v1/appAssetLibraryPlacements") controller.abort();
      return response;
    };
    const { client } = await admin();
    const response = await executeAscUpload(client, duoJob(), { fetch: aborting, sleep: instant, signal: controller.signal });
    expect(await response.json()).toEqual({ error: "ASC_ABORTED" });
    expect(paths(apple, "DELETE")).toEqual(["/v1/appAssetLibraryPlacements/placement-1", "/v1/appAssetLibraryImages/image-1", "/v1/appAssetLibraryImages/image-2"]);
    expect([...apple.images.values()].every((image) => image.deleted)).toBe(true);
  });
});

describe("asc_upload job", () => {
  it.each([
    ["outer", "portrait", 1398, 2034], ["outer", "landscape", 2034, 1398],
    ["inner", "portrait", 2007, 2853], ["inner", "landscape", 2853, 2007],
  ] as const)("accepts PNG and JPEG for %s %s (%i x %i)", async (side, orientation, width, height) => {
    const zipFiles = Object.fromEntries(await Promise.all((["png", "jpeg"] as const).map(async (format, index) => [
      `harbor/duo-${side}-${orientation}/0${index + 1}.${format === "jpeg" ? "jpg" : "png"}`, await screenshot(width, height, format),
    ]))) as typeof files;
    const apple = fakeApple();
    const { client } = await admin({ zipFiles });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect(apple.sets).toEqual([{ id: expect.any(String), displayType: "APP_IPHONE_DUO" }]);
    expect(apple.shots.size).toBe(2);
    const creation = apple.calls.find((call) => call.method === "POST" && new URL(call.url).pathname === "/v1/appScreenshotSets");
    expect(creation?.body).toMatchObject({ data: { relationships: { appStoreVersionLocalization: { data: { id: "loc-1" } } } } });
  });

  it.each(["phone-size", "wrong-size", "wrong-format", "corrupt"])("rejects %s Duo bytes before any API request", async (kind) => {
    const invalid = kind === "corrupt" ? Buffer.from("not an image")
      : kind === "wrong-format" ? await screenshot(2007, 2853, "webp")
      : kind === "phone-size" ? await screenshot(1320, 2868) : await screenshot(2853, 2008);
    const apple = fakeApple();
    const { client } = await admin({ zipFiles: { ...files, "harbor/duo-inner-portrait/01.png": invalid } });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(true).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_INVALID" });
    expect(apple.calls).toHaveLength(0);
  });

  it.each([
    null,
    {},
    { displayType: "APP_IPHONE_DUO" },
    { displayType: "APP_IPHONE_DUO", files: null },
    { displayType: "APP_IPHONE_DUO", files: [42] },
    { displayType: "APP_IPHONE_67", files: [] },
  ])("rejects malformed selection manifests before contacting Apple (%j)", async (manifest) => {
    const apple = fakeApple();
    const { client } = await admin({ manifest });
    const response = await executeAscUpload(client, job(), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_DUO_SELECTION" });
    expect(apple.calls).toHaveLength(0);
  });

  it("reads the ZIP manifest to upload a mix in selection order", async () => {
    const apple = fakeApple();
    const { client } = await admin({ duoOrder: ["harbor/duo-inner-portrait/01.png", "harbor/duo-outer-portrait/01.png"] });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect([...apple.shots.values()].map((shot) => shot.fileName)).toEqual(["duoshot-duo-inner-portrait-01.png", "duoshot-duo-outer-portrait-01.png"]);
  });
  it("rejects an overfull legacy ZIP before calling Apple", async () => {
    const apple = fakeApple();
    const { client } = await admin({ rawDuoCount: 6 });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "DUO_SLOT_LIMIT" });
    expect(apple.calls).toHaveLength(0);
  });

  it("uploads both Duo sizes into exactly one screenshot set", async () => {
    const apple = fakeApple();
    const { client } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    expect(apple.sets).toEqual([{ id: expect.any(String), displayType: "APP_IPHONE_DUO" }]);
    const shots = [...apple.shots.values()];
    expect(shots.map((shot) => shot.fileName)).toEqual(["duoshot-duo-outer-portrait-01.png", "duoshot-duo-inner-portrait-01.png"]);
    expect(apple.calls.filter((call) => call.method === "POST" && new URL(call.url).pathname === "/v1/appScreenshotSets")).toHaveLength(1);
    expect(apple.calls.filter((call) => call.method === "PATCH" && call.url.includes("/relationships/appScreenshots"))).toHaveLength(1);
  });

  it.each([false, true])("counts both Duo sizes and existing shots together before writing (replace: %s)", async (replaceExisting) => {
    const apple = fakeApple({ sets: [{ id: "duo", displayType: "APP_IPHONE_DUO" }], existing: { duo: Array.from({ length: 9 }, (_, i) => `old-${i}`) } });
    const { client } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_SET_FULL" });
    expect(apple.calls.every((call) => call.method === "GET")).toBe(true);
  });


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
    expect(complete[1]).toMatchObject({ p_job: "job-1", p_lease: "lease-1", p_error: undefined, p_result: { uploaded: 2, reordered: true, skipped: [] } });
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

  it("cleans up a reservation even when Apple returns no upload operations", async () => {
    const apple = fakeApple({ parts: 0 });
    const { client, rpc } = await admin();
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(await response.json()).toEqual({ error: "ASC_UPLOAD_FAILED" });
    const created = [...apple.shots.keys()];
    expect(created).toHaveLength(1);
    expect(apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname))
      .toEqual(created.map((id) => `/v1/appScreenshots/${id}`));
    expect(apple.calls.some((call) => call.method === "PUT" || call.method === "PATCH")).toBe(false);
    expect(progressCalls(rpc).at(-1)!.files[0]).toMatchObject({ state: "failed", error: "ASC_UPLOAD_FAILED" });
  });

  it.each(["response", "exception"])("keeps live replacements when recording the completed job fails (%s)", async (failure) => {
    const previous = ["old-1", "old-2"];
    const apple = fakeApple({ sets: [{ id: "duo", displayType: "APP_IPHONE_DUO" }], existing: { duo: [...previous] } });
    const { client, rpc } = await admin();
    rpc.mockImplementation(async (name) => {
      if (name === "complete_render") {
        if (failure === "exception") throw new Error("database unavailable");
        return { data: false, error: { message: "database unavailable" } };
      }
      return { data: true, error: null };
    });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting: true, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(apple.existing.duo).toEqual([]);
    expect(apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname))
      .toEqual(previous.map((id) => `/v1/appScreenshots/${id}`));
    expect(await response.json()).toEqual({ error: "ASC_RETRY_UNSAFE" });
    expect(progressCalls(rpc).at(-1)!.files.every((file) => file.state === "complete")).toBe(true);
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

  it.each([false, true])("finalizes a mixed Duo selection once on the shared set (replace: %s)", async (replaceExisting) => {
    const previous = ["old-1", "old-2"];
    const apple = fakeApple({ sets: [{ id: "duo", displayType: "APP_IPHONE_DUO" }], existing: { duo: [...previous] } });
    const { client, rpc } = await admin({ duoOrder: ["harbor/duo-inner-portrait/01.png", "harbor/duo-outer-portrait/01.png"] });
    const response = await executeAscUpload(client, job({ payload: { ...PAYLOAD, replaceExisting, targets: ascTargetsForExport(false).targets } }), { fetch: apple.fetch, sleep: instant });
    expect(response.status).toBe(200);
    const uploaded = [...apple.shots.keys()];
    expect([...apple.shots.values()].map((shot) => [shot.set, shot.fileName])).toEqual([
      ["duo", "duoshot-duo-inner-portrait-01.png"], ["duo", "duoshot-duo-outer-portrait-01.png"],
    ]);
    expect(apple.calls.filter((call) => call.method === "POST" && new URL(call.url).pathname === "/v1/appScreenshotSets")).toHaveLength(0);
    expect(apple.calls.filter((call) => call.method === "GET" && new URL(call.url).pathname === "/v1/appScreenshotSets/duo/appScreenshots")).toHaveLength(1);
    const reorders = apple.calls.filter((call) => call.method === "PATCH" && call.url.includes("/relationships/appScreenshots"));
    expect(reorders).toHaveLength(1);
    expect(reorders[0]).toMatchObject({
      url: "https://api.appstoreconnect.apple.com/v1/appScreenshotSets/duo/relationships/appScreenshots",
      body: { data: (replaceExisting ? uploaded : [...previous, ...uploaded]).map((id) => ({ type: "appScreenshots", id })) },
    });
    const methods = apple.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`);
    expect(methods.filter((call) => call.startsWith("DELETE"))).toEqual(replaceExisting ? previous.map((id) => `DELETE /v1/appScreenshots/${id}`) : []);
    if (replaceExisting) {
      expect(methods.findIndex((call) => call.startsWith("DELETE"))).toBeGreaterThan(methods.findLastIndex((call) => /^GET \/v1\/appScreenshots\/shot-/.test(call)));
    }
    expect(rpc.mock.calls.find(([name]) => name === "complete_render")![1]).toMatchObject({ p_result: { uploaded: 2, replaced: replaceExisting ? 2 : 0, reordered: true, skipped: [] } });
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
