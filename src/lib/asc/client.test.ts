import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fakeApple } from "@/test/asc-apple-mock";
import { AscError, ascErrorStatus, createAscClient, isAllowedUploadOperation } from "./client";

const pem = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const credentials = { issuerId: "57246542-96fe-1a63-e053-0824d011072a", keyId: "2X9R4HXF34", privateKey: pem };
const instant = async () => {};

function client(apple: ReturnType<typeof fakeApple>, now = () => 1_800_000_000_000) {
  return createAscClient(credentials, { fetch: apple.fetch, sleep: instant, now });
}

describe("App Store Connect client", () => {
  it("authenticates API calls with a bearer JWT and maps apps", async () => {
    const apple = fakeApple();
    expect(await client(apple).listApps()).toEqual([{ id: "app-1", name: "Harbor", bundleId: "com.example.harbor" }]);
    expect(apple.calls[0]!.url).toMatch(/^https:\/\/api\.appstoreconnect\.apple\.com\/v1\/apps\?/);
    expect(apple.calls[0]!.headers.Authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  });

  it("filters versions on editable states", async () => {
    const apple = fakeApple();
    await client(apple).listEditableVersions("app-1").catch(() => undefined);
    const url = new URL(apple.calls[0]!.url);
    expect(url.pathname).toBe("/v1/apps/app-1/appStoreVersions");
    expect(url.searchParams.get("filter[appVersionState]")).toContain("PREPARE_FOR_SUBMISSION");
    expect(url.searchParams.get("filter[platform]")).toBe("IOS");
  });

  it("reuses an existing screenshot set and creates a missing one", async () => {
    const apple = fakeApple({ sets: [{ id: "set-67", displayType: "APP_IPHONE_67" }] });
    const asc = client(apple);
    expect(await asc.ensureScreenshotSet("loc-1", "APP_IPHONE_67")).toBe("set-67");
    const created = await asc.ensureScreenshotSet("loc-1", "APP_IPHONE_65");
    expect(created).not.toBe("set-67");
    expect(apple.calls.at(-1)!.body).toEqual({ data: {
      type: "appScreenshotSets", attributes: { screenshotDisplayType: "APP_IPHONE_65" },
      relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: "loc-1" } } },
    } });
  });

  it("reserves, uploads every part as instructed, commits the MD5 and waits for COMPLETE", async () => {
    const apple = fakeApple({ parts: 3, states: ["UPLOAD_COMPLETE", "UPLOAD_COMPLETE", "COMPLETE"] });
    const bytes = randomBytes(10_000);
    const result = await client(apple).uploadScreenshot("set-1", "01.png", bytes);
    expect(result.state).toBe("COMPLETE");
    const reserve = apple.calls.find((call) => call.method === "POST" && call.url.endsWith("/v1/appScreenshots"))!;
    expect(reserve.body).toMatchObject({ data: { attributes: { fileName: "01.png", fileSize: 10_000 }, relationships: { appScreenshotSet: { data: { id: "set-1" } } } } });
    const puts = apple.calls.filter((call) => call.url.startsWith("https://upload.blobstore.apple.com/"));
    expect(puts).toHaveLength(3);
    for (const put of puts) {
      expect(put.method).toBe("PUT");
      expect(put.headers).toEqual({ "Content-Type": "image/png" });
    }
    expect(apple.assembled(result.id).equals(bytes)).toBe(true);
    expect(apple.shots.get(result.id)!.checksum).toBe(apple.md5(bytes));
    const commit = apple.calls.find((call) => call.method === "PATCH")!;
    expect(commit.body).toEqual({ data: { type: "appScreenshots", id: result.id, attributes: { uploaded: true, sourceFileChecksum: apple.md5(bytes) } } });
  });

  it("reports processing failure and timeout with stable codes", async () => {
    await expect(client(fakeApple({ states: ["FAILED"] })).uploadScreenshot("set-1", "01.png", randomBytes(10)))
      .rejects.toMatchObject({ code: "ASC_PROCESSING_FAILED" });
    let clock = 0;
    const slow = createAscClient(credentials, { fetch: fakeApple({ states: ["UPLOAD_COMPLETE"] }).fetch, now: () => clock, sleep: async (ms) => { clock += ms; } });
    await expect(slow.uploadScreenshot("set-1", "01.png", randomBytes(10), { timeoutMs: 10_000 }))
      .rejects.toMatchObject({ code: "ASC_PROCESSING_TIMEOUT" });
  });

  it("maps Apple 409 and 422 responses to stable codes and HTTP statuses", async () => {
    const conflict = fakeApple({ fail: (method, path) => method === "POST" && path === "/v1/appScreenshots" ? { status: 409, code: "STATE_ERROR" } : null });
    const error = await client(conflict).uploadScreenshot("set-1", "01.png", randomBytes(10)).catch((caught) => caught);
    expect(error).toBeInstanceOf(AscError);
    expect(error).toMatchObject({ code: "ASC_CONFLICT", status: 409, appleCode: "STATE_ERROR" });
    expect(ascErrorStatus(error.code)).toBe(409);
    const invalid = fakeApple({ fail: (method) => method === "PATCH" ? { status: 422, code: "ENTITY_ERROR" } : null });
    await expect(client(invalid).uploadScreenshot("set-1", "01.png", randomBytes(10))).rejects.toMatchObject({ code: "ASC_INVALID" });
    const unauthorized = fakeApple({ fail: () => ({ status: 401, code: "NOT_AUTHORIZED" }) });
    await expect(client(unauthorized).verify()).rejects.toMatchObject({ code: "ASC_UNAUTHORIZED" });
    expect(ascErrorStatus("ASC_UNAUTHORIZED")).toBe(424);
  });

  it("fails the part upload after retrying transient errors, without sending the JWT to the blob store", async () => {
    const apple = fakeApple();
    let attempts = 0;
    const flaky: typeof fetch = async (input, init) => {
      if (String(input).startsWith("https://upload.blobstore.apple.com/")) { attempts++; return new Response(null, { status: 503 }); }
      return apple.fetch(input, init);
    };
    const asc = createAscClient(credentials, { fetch: flaky, sleep: instant });
    await expect(asc.uploadScreenshot("set-1", "01.png", randomBytes(10))).rejects.toMatchObject({ code: "ASC_UPLOAD_FAILED" });
    expect(attempts).toBe(3);
  });

  it("only sends bytes with PUT to Apple-owned HTTPS hosts", async () => {
    expect(isAllowedUploadOperation({ method: "PUT", url: "https://store-030.blobstore.apple.com/a?Signature=x" })).toBe(true);
    for (const operation of [
      { method: "POST", url: "https://store-030.blobstore.apple.com/a" },
      { method: "PUT", url: "http://store-030.blobstore.apple.com/a" },
      { method: "PUT", url: "https://evil.example/a" },
      { method: "PUT", url: "https://apple.com.evil.example/a" },
      { method: "PUT", url: "https://notapple.com/a" },
      { method: "PUT", url: "https://user:pass@store.apple.com/a" },
      { method: "PUT", url: "not a url" },
    ]) expect(isAllowedUploadOperation(operation)).toBe(false);
    const sent: string[] = [];
    const hostile: typeof fetch = async (input) => {
      sent.push(String(input));
      return new Response(JSON.stringify({ data: { id: "shot-1", type: "appScreenshots", attributes: {
        uploadOperations: [
          { method: "PUT", url: "https://store-030.blobstore.apple.com/ok", offset: 0, length: 5 },
          { method: "PUT", url: "https://collector.example/steal", offset: 5, length: 5 },
        ],
      } } }), { status: 201 });
    };
    const asc = createAscClient(credentials, { fetch: hostile, sleep: instant });
    await expect(asc.uploadScreenshot("set-1", "01.png", randomBytes(10))).rejects.toMatchObject({ code: "ASC_UPLOAD_OPERATION_INVALID" });
    // Only the reservation went out: no part was sent anywhere, not even to the valid host.
    expect(sent).toHaveLength(1);
  });

  it("never follows pagination links outside the API host", async () => {
    const leaking: typeof fetch = async () => new Response(JSON.stringify({ data: [], links: { next: "https://evil.example/v1/apps" } }), { status: 200 });
    const asc = createAscClient(credentials, { fetch: leaking, sleep: instant });
    await expect(asc.listApps()).rejects.toMatchObject({ code: "ASC_UNAVAILABLE" });
  });

  it("deletes existing screenshots and reorders by relationship", async () => {
    const apple = fakeApple({ existing: { "set-1": ["old-1", "old-2"] } });
    const asc = client(apple);
    expect(await asc.deleteExistingScreenshots("set-1")).toBe(2);
    expect(apple.calls.filter((call) => call.method === "DELETE").map((call) => new URL(call.url).pathname)).toEqual(["/v1/appScreenshots/old-1", "/v1/appScreenshots/old-2"]);
    await asc.reorderScreenshots("set-1", ["b", "a"]);
    expect(apple.calls.at(-1)).toMatchObject({ method: "PATCH", body: { data: [{ type: "appScreenshots", id: "b" }, { type: "appScreenshots", id: "a" }] } });
  });
});
