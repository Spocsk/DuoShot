import { generateKeyPairSync } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fakeAssetLibraryApple } from "@/test/asc-asset-library-mock";
import { refDataFixture } from "@/test/fixtures/asc-asset-library/fixtures";
import { AscError } from "./client";
import { createAssetLibraryClient } from "./asset-library";
import { duoSlotLimit, expectedImageSpec, groupImageSpecs, placementLimit, resolveDuoGroup, resolveImageGroup, verifyImageSpec } from "./asset-library-refdata";
import { DUO_SLOT_MAX } from "../duo-selection";

const credentials = { issuerId: "57246542-96fe-1a63-e053-0824d011072a", keyId: "2X9R4HXF34",
  privateKey: generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "pem", type: "pkcs8" }).toString() };
const instant = async () => {};
const client = (apple: ReturnType<typeof fakeAssetLibraryApple>) => createAssetLibraryClient(credentials, { fetch: apple.fetch, sleep: instant });
let bytes: Buffer;
beforeAll(async () => { bytes = await sharp({ create: { width: 1398, height: 2034, channels: 3, background: "blue" } }).png().toBuffer(); });
afterEach(() => vi.restoreAllMocks());
function upload(apple: ReturnType<typeof fakeAssetLibraryApple>, extra = {}) {
  const group = resolveDuoGroup(apple.refData);
  return client(apple).uploadImage({ libraryId: "library-1", fileName: "outer.png", bytes, refData: apple.refData, group,
    expectedSpec: expectedImageSpec(apple.refData, group, 1398, 2034), ...extra });
}

describe("App Asset Library reference data", () => {
  it("follows renamed groups through the six parallel arrays and the specMappings", async () => {
    const refData = refDataFixture("RENAMED_DUO_GROUP");
    const apple = fakeAssetLibraryApple({ refData });
    const ref = await client(apple).getRefData();
    expect(Object.keys(ref).sort()).toEqual(["displayClasses", "features", "imageSpecs", "placementProfileGroups", "placementTypes", "videoSpecs"]);
    expect(resolveDuoGroup(ref)).toBe("RENAMED_DUO_GROUP");
    expect(groupImageSpecs(ref, resolveDuoGroup(ref))).toHaveLength(4);
    expect(expectedImageSpec(ref, resolveDuoGroup(ref), 2007, 2853).shortName).toBe("i2007x2853a0");
    expect(await client(apple).getAssetLibraryId("app-1")).toBe("library-1");
  });

  it.each([[1320, 2868], [2868, 1320]])("discovers the 6.9-inch group from exact %i×%i dimensions", (width, height) => {
    const ref = refDataFixture();
    ref.placementProfileGroups![1]!.placementProfileGroupId = "NEW_PHONE_GROUP";
    ref.placementTypes![0]!.specMappings![1]!.placementGroupId = "NEW_PHONE_GROUP";
    expect(resolveImageGroup(ref, width, height)).toBe("NEW_PHONE_GROUP");
    expect(expectedImageSpec(ref, "NEW_PHONE_GROUP", width, height)).toMatchObject({ dimensions: { minWidth: width, minHeight: height } });
  });

  it("requires the Duo display class, iOS platform, mapping and category", () => {
    const noGroup = refDataFixture(); noGroup.placementProfileGroups = [];
    expect(() => resolveDuoGroup(noGroup)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_GROUP_NOT_FOUND" }));
    const wrongPlatform = refDataFixture(); wrongPlatform.placementProfileGroups![0]!.platform = "MAC_APP_STORE";
    expect(() => resolveDuoGroup(wrongPlatform)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_GROUP_NOT_FOUND" }));
    const noMapping = refDataFixture(); noMapping.placementTypes![0]!.specMappings = [];
    expect(() => resolveDuoGroup(noMapping)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_GROUP_NOT_FOUND" }));
    const noCategory = refDataFixture(); noCategory.placementTypes![0]!.acceptsAssetCategories = ["CREATIVE_ASSETS"];
    expect(() => resolveDuoGroup(noCategory)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_CATEGORY_INVALID" }));
    const unknownSpec = refDataFixture(); unknownSpec.imageSpecs = [];
    expect(() => resolveDuoGroup(unknownSpec)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_SPEC_NOT_FOUND" }));
  });

  it("rejects dimension ranges and missing features, reads maxCount and falls back to DUO_SLOT_MAX", () => {
    const ref = refDataFixture(); const group = resolveDuoGroup(ref);
    ref.imageSpecs![0]!.dimensions!.maxWidth = 1400;
    expect(() => expectedImageSpec(ref, group, 1398, 2034)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_SPEC_NOT_FOUND" }));
    expect(placementLimit(refDataFixture(group, 3), group)).toBe(3);
    expect(duoSlotLimit(refDataFixture(group, 3), group)).toBe(3);
    expect(duoSlotLimit(refDataFixture(group, null), group)).toBe(DUO_SLOT_MAX);
    expect(duoSlotLimit()).toBe(DUO_SLOT_MAX);
    ref.features = [];
    expect(() => placementLimit(ref, group)).toThrow(expect.objectContaining({ code: "ASC_REFDATA_FEATURE_NOT_FOUND" }));
  });

  it.each([null, "unknown-spec", "inner", "out-of-group", "wrong-dimensions"])("explains spec mismatches (%s), including expected and received screens", (kind) => {
    const ref = refDataFixture(); const group = resolveDuoGroup(ref);
    const expected = expectedImageSpec(ref, group, 1398, 2034);
    let received = kind;
    if (kind === "inner") received = ref.imageSpecs![2]!.specId!;
    if (kind === "out-of-group") { received = expected.specId; ref.placementTypes![0]!.specMappings![0]!.specs = []; }
    if (kind === "wrong-dimensions") { received = expected.specId; ref.imageSpecs![0] = { ...ref.imageSpecs![0], dimensions: { minWidth: 1, maxWidth: 1, minHeight: 1, maxHeight: 1 } }; }
    try { verifyImageSpec(ref, group, expected, received); throw new Error("expected mismatch"); } catch (error) {
      expect(error).toBeInstanceOf(AscError);
      expect(error).toMatchObject({ code: "ASC_SPEC_MISMATCH" });
      expect((error as Error).message).toContain("i1398x2034a0 (1398×2034, écran externe)");
      if (kind === "inner") expect((error as Error).message).toContain("i2007x2853a0 (2007×2853, écran interne)");
    }
  });

  it("rejects malformed or multiple refData records", async () => {
    for (const data of [[], [{ attributes: {} }], [{ attributes: refDataFixture() }, { attributes: refDataFixture() }]]) {
      const asc = createAssetLibraryClient(credentials, { fetch: async () => new Response(JSON.stringify({ data })) });
      await expect(asc.getRefData()).rejects.toMatchObject({ code: "ASC_REFDATA_INVALID" });
    }
  });
});

describe("App Asset Library client", () => {
  it.each(["PREPARE_FOR_SUBMISSION", "APPROVED", "REJECTED", "DEVELOPER_REJECTED", "READY_FOR_REVIEW"])("checks the included parent version in state %s", async (versionState) => {
    const apple = fakeAssetLibraryApple({ versionState });
    const result = client(apple).ensureVersionEditable("loc-1");
    if (versionState === "PREPARE_FOR_SUBMISSION") await expect(result).resolves.toBeUndefined();
    else await expect(result).rejects.toMatchObject({ code: "ASC_VERSION_NOT_EDITABLE" });
    expect(apple.calls).toHaveLength(1);
    const url = new URL(apple.calls[0]!.url);
    expect(url.pathname).toBe("/v1/appStoreVersionLocalizations/loc-1");
    expect(Object.fromEntries(url.searchParams)).toEqual({ include: "appStoreVersion", "fields[appStoreVersions]": "appVersionState" });
  });

  it.each([
    "/v1/appStoreVersionLocalizations/loc-1/appStoreVersion?fields[appStoreVersions]=appVersionState",
    "/v1/other/loc-1/appStoreVersion",
    "/v1/appStoreVersionLocalizations/loc-1",
    "/v1/appStoreVersionLocalizations/loc-1?fields[appStoreVersions]=appVersionState",
    "/v1/appStoreVersionLocalizations/loc-1?include=appStoreVersion",
    "/v1/other/loc-1?include=appStoreVersion&fields[appStoreVersions]=appVersionState",
  ])("mock refuses an undocumented version lookup: %s", async (path) => {
    const apple = fakeAssetLibraryApple();
    expect((await apple.fetch(`https://api.appstoreconnect.apple.com${path}`)).status).toBe(404);
  });

  it.each(["missing-included", "missing-state", "wrong-id", "wrong-type", "missing-relationship"])("fails closed for %s even with another editable resource in included", async (kind) => {
    const apple = fakeAssetLibraryApple();
    const asc = createAssetLibraryClient(credentials, { fetch: async (input, init) => {
      const response = await apple.fetch(input, init);
      const document = await response.json();
      if (kind === "missing-included") delete document.included;
      if (kind === "missing-state") delete document.included[0].attributes.appVersionState;
      if (kind === "wrong-id") document.included[0].id = "another-version";
      if (kind === "wrong-type") document.included[0].type = "appScreenshotSets";
      if (kind === "missing-relationship") delete document.data.relationships;
      return Response.json(document);
    } });
    await expect(asc.ensureVersionEditable("loc-1")).rejects.toMatchObject({ code: "ASC_VERSION_NOT_EDITABLE" });
  });

  it("selects the related version by type and id among included resources", async () => {
    const apple = fakeAssetLibraryApple();
    const asc = createAssetLibraryClient(credentials, { fetch: async (input, init) => {
      const document = await (await apple.fetch(input, init)).json();
      document.included.unshift({ type: "appStoreVersions", id: "another-version", attributes: { appVersionState: "APPROVED" } },
        { type: "appScreenshotSets", id: "ver-1" });
      return Response.json(document);
    } });
    await expect(asc.ensureVersionEditable("loc-1")).resolves.toBeUndefined();
  });

  it.each(["PREPARE_FOR_SUBMISSION", "COMPLETE"])("reserves, sends exact parts without JWT, commits uploaded alone, and accepts %s", async (state) => {
    const apple = fakeAssetLibraryApple({ states: ["UPLOAD_COMPLETE", state], parts: 3 });
    const reserved: string[] = [];
    const result = await upload(apple, { referenceName: "outer", onReserved: (id: string) => { reserved.push(id); } });
    expect(reserved).toEqual([result.id]);
    expect(apple.assembled(result.id)).toEqual(bytes);
    expect(apple.calls[0]).toMatchObject({ method: "POST", headers: { authorization: expect.stringMatching(/^Bearer /) }, body: { data: {
      attributes: { fileName: "outer.png", fileSize: bytes.length, category: "APP_SCREENSHOTS_AND_PREVIEWS", referenceName: "outer" },
      relationships: { assetLibrary: { data: { type: "appAssetLibraries", id: "library-1" } } },
    } } });
    expect(apple.calls.filter((call) => call.method === "PUT")).toHaveLength(3);
    for (const call of apple.calls.filter((call) => call.method === "PUT")) expect(call.headers).toEqual({ "content-type": "image/png" });
    expect(apple.calls.find((call) => call.method === "PATCH")!.body).toEqual({ data: {
      type: "appAssetLibraryImages", id: result.id, attributes: { uploaded: true },
    } });
  });

  it("keeps FAILED stateDetails on the server and times out processing", async () => {
    await expect(upload(fakeAssetLibraryApple({ states: ["FAILED"] }))).rejects.toMatchObject({ code: "ASC_PROCESSING_FAILED", details: [{ code: "INVALID_IMAGE", message: expect.any(String) }] });
    let now = 0;
    const apple = fakeAssetLibraryApple({ states: ["UPLOAD_COMPLETE"] });
    const group = resolveDuoGroup(apple.refData);
    const asc = createAssetLibraryClient(credentials, { fetch: apple.fetch, now: () => now, sleep: async (ms) => { now += ms; } });
    await expect(asc.uploadImage({ libraryId: "library-1", fileName: "outer.png", bytes, group, refData: apple.refData,
      expectedSpec: expectedImageSpec(apple.refData, group, 1398, 2034), timeoutMs: 5000 })).rejects.toMatchObject({ code: "ASC_PROCESSING_TIMEOUT" });
  });

  it.each([
    { method: "POST", url: "https://upload.blobstore.apple.com/part", offset: 0, length: 8 },
    { method: "PUT", url: "https://collector.example/part", offset: 0, length: 8 },
    { method: "PUT", url: "http://upload.blobstore.apple.com/part", offset: 0, length: 8 },
    { method: "PUT", url: "https://upload.blobstore.apple.com/part", offset: 0.5, length: 8 },
    { method: "PUT", url: "https://upload.blobstore.apple.com/part", offset: 0, length: 8, requestHeaders: [{ name: "Authorization", value: "Bearer unwanted" }] },
    { method: "PUT", url: "https://upload.blobstore.apple.com/part", offset: 0, length: 8, requestHeaders: [{ name: " Authorization ", value: "Bearer unwanted" }] },
    { method: "PUT", url: "https://upload.blobstore.apple.com/part", offset: 0, length: 8, requestHeaders: [{ name: "Proxy-Authorization", value: "Bearer unwanted" }] },
  ])("rejects unsafe operations before sending any byte ($url, $method)", async (operation) => {
    const apple = fakeAssetLibraryApple({ operations: [operation] });
    await expect(upload(apple)).rejects.toMatchObject({ code: "ASC_UPLOAD_OPERATION_INVALID" });
    expect(apple.calls).toHaveLength(1);
  });

  it("lists paginated placements with filters and sort, creates placements and orders explicit ids", async () => {
    const apple = fakeAssetLibraryApple({ existing: { group: ["old-a", "old-b", "old-c"] }, pageSize: 2 });
    const asc = client(apple);
    expect(await asc.listPlacements("loc-1", "group")).toEqual(["old-a", "old-b", "old-c"]);
    const query = new URL(apple.calls[0]!.url).searchParams;
    expect(query.get("filter[placementType]")).toBe("APP_SCREENSHOT");
    expect(query.get("filter[placementGroup]")).toBe("group");
    expect(query.get("sort")).toBe("placementGroupPosition");
    const id = await asc.createPlacement("loc-1", "group", "image-1");
    expect(apple.calls.at(-1)!.body).toMatchObject({ data: { attributes: { placementType: "APP_SCREENSHOT", placementGroup: "group" }, relationships: {
      image: { data: { type: "appAssetLibraryImages", id: "image-1" } }, appStoreVersionLocalization: { data: { id: "loc-1" } },
    } } });
    await asc.setOrder("loc-1", "group", [id, "old-c", "old-a"]);
    expect(apple.calls.at(-1)!.body).toEqual({ data: { type: "appAssetLibraryPlacementOrderingRequests", attributes: { placementGroup: "group" }, relationships: {
      orderedPlacements: { data: [id, "old-c", "old-a"].map((id) => ({ type: "appAssetLibraryPlacements", id })) },
      appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: "loc-1" } },
    } } });
  });

  it.each([["STATE_ERROR.INVALID_STATE", "ASC_VERSION_NOT_EDITABLE"], ["ENTITY_ERROR.ATTRIBUTE.INVALID", "ASC_PLACEMENT_INVALID"]])("maps placement 409 %s", async (appleCode, code) => {
    const apple = fakeAssetLibraryApple({ fail: () => ({ status: 409, code: appleCode }) });
    await expect(client(apple).createPlacement("loc-1", "group", "image-1")).rejects.toMatchObject({ code, appleCode, status: 409 });
  });

  it("deletes placements before images and maps ASSET_HAS_PLACEMENTS", async () => {
    const apple = fakeAssetLibraryApple(); const asc = client(apple);
    const image = await upload(apple);
    const placement = await asc.createPlacement("loc-1", resolveDuoGroup(apple.refData), image.id);
    await expect(asc.deleteImage(image.id)).rejects.toMatchObject({ code: "ASC_ASSET_HAS_PLACEMENTS", appleCode: "STATE_ERROR.ASSET_HAS_PLACEMENTS" });
    await asc.deletePlacement(placement);
    await asc.deleteImage(image.id);
    expect(apple.images.get(image.id)!.deleted).toBe(true);
  });

  it("keeps pagination JWTs on the API host, and honors cancellation", async () => {
    const calls: string[] = [];
    const asc = createAssetLibraryClient(credentials, { fetch: async (input) => {
      calls.push(String(input)); return new Response(JSON.stringify({ data: [], links: { next: "https://elsewhere.example/list" } }));
    } });
    await expect(asc.listPlacements("loc-1", "group")).rejects.toMatchObject({ code: "ASC_UNAVAILABLE" });
    expect(calls).toHaveLength(1);
    const controller = new AbortController(); controller.abort();
    const apple = fakeAssetLibraryApple();
    await expect(createAssetLibraryClient(credentials, { fetch: apple.fetch, signal: controller.signal }).getRefData()).rejects.toMatchObject({ code: "ASC_ABORTED" });
    expect(apple.calls).toHaveLength(0);
  });

  it("rejects incomplete pagination instead of undercounting placements", async () => {
    const apple = fakeAssetLibraryApple({ existing: { group: Array.from({ length: 6 }, (_, index) => `old-${index}`) }, pageSize: 1 });
    await expect(client(apple).listPlacements("loc-1", "group")).rejects.toMatchObject({ code: "ASC_UNAVAILABLE" });
    expect(apple.calls).toHaveLength(5);
  });

  it("rejects redirects for both authenticated API requests and unauthenticated parts", async () => {
    const apple = fakeAssetLibraryApple();
    const requests: { url: string; headers: Headers }[] = [];
    const asc = createAssetLibraryClient(credentials, { sleep: instant, fetch: async (input, init) => {
      expect(init?.redirect).toBe("error");
      requests.push({ url: String(input), headers: new Headers(init?.headers) });
      if (init?.method === "PUT" || init?.method === "GET") return new Response(null, { status: 307, headers: { Location: "https://elsewhere.example/redirected" } });
      return apple.fetch(input, init);
    } });
    await expect(asc.getRefData()).rejects.toMatchObject({ code: "ASC_UNAVAILABLE" });
    const group = resolveDuoGroup(apple.refData);
    await expect(asc.uploadImage({ libraryId: "library-1", fileName: "outer.png", bytes, refData: apple.refData, group,
      expectedSpec: expectedImageSpec(apple.refData, group, 1398, 2034) })).rejects.toMatchObject({ code: "ASC_UPLOAD_FAILED" });
    expect(requests.every(({ url }) => new URL(url).hostname.endsWith(".apple.com"))).toBe(true);
    expect(requests.filter(({ url }) => new URL(url).hostname === "upload.blobstore.apple.com").every(({ headers }) => !headers.has("authorization"))).toBe(true);
  });

  it("includes transfer time in the processing deadline", async () => {
    let now = 0;
    const apple = fakeAssetLibraryApple({ states: ["UPLOAD_COMPLETE"] });
    const asc = createAssetLibraryClient(credentials, { now: () => now, sleep: async (ms) => { now += ms; }, fetch: async (input, init) => {
      const response = await apple.fetch(input, init);
      if (init?.method === "PATCH") now += 4000;
      return response;
    } });
    const group = resolveDuoGroup(apple.refData);
    await expect(asc.uploadImage({ libraryId: "library-1", fileName: "outer.png", bytes, refData: apple.refData, group,
      expectedSpec: expectedImageSpec(apple.refData, group, 1398, 2034), timeoutMs: 5000 })).rejects.toMatchObject({ code: "ASC_PROCESSING_TIMEOUT" });
    expect(now).toBe(4000);
  });

  it.each(["PREPARE_FOR_SUBMISSION", "COMPLETE"])("rejects a ready %s response arriving at or after the deadline", async (state) => {
    for (const elapsed of [1000, 2000]) {
      let now = 0;
      const apple = fakeAssetLibraryApple({ states: [state] });
      const asc = createAssetLibraryClient(credentials, { now: () => now, fetch: async (input, init) => {
        const response = await apple.fetch(input, init);
        if (init?.method === "GET") now = elapsed;
        return response;
      } });
      const group = resolveDuoGroup(apple.refData);
      await expect(asc.uploadImage({ libraryId: "library-1", fileName: "outer.png", bytes, group, refData: apple.refData,
        expectedSpec: expectedImageSpec(apple.refData, group, 1398, 2034), timeoutMs: 1000 })).rejects.toMatchObject({ code: "ASC_PROCESSING_TIMEOUT" });
    }
  });

  it("caps reservation, transfer, commit and poll timeouts to the remaining budget", async () => {
    let now = 0;
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const apple = fakeAssetLibraryApple({ states: ["COMPLETE"], parts: 1 });
    const asc = createAssetLibraryClient(credentials, { now: () => now, fetch: async (input, init) => {
      const response = await apple.fetch(input, init);
      now += 100;
      return response;
    } });
    const group = resolveDuoGroup(apple.refData);
    await asc.uploadImage({ libraryId: "library-1", fileName: "outer.png", bytes, group, refData: apple.refData,
      expectedSpec: expectedImageSpec(apple.refData, group, 1398, 2034), timeoutMs: 1000 });
    expect(timeout.mock.calls.map(([ms]) => ms)).toEqual([1000, 900, 800, 700]);
  });
});
