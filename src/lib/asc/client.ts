import { createHash } from "node:crypto";
import { mapLimit } from "../map-limit";
import { ASC_API_BASE, ASC_EDITABLE_VERSION_STATES } from "./config";
import { signAscToken, type AscCredentials } from "./jwt";

/** Stable codes the API routes and job results expose; Apple's raw messages stay server-side. */
export type AscErrorCode =
  | "ASC_BAD_REQUEST" | "ASC_UNAUTHORIZED" | "ASC_FORBIDDEN" | "ASC_NOT_FOUND" | "ASC_CONFLICT"
  | "ASC_INVALID" | "ASC_RATE_LIMITED" | "ASC_UNAVAILABLE" | "ASC_UNREACHABLE"
  | "ASC_UPLOAD_FAILED" | "ASC_PROCESSING_FAILED" | "ASC_PROCESSING_TIMEOUT" | "ASC_ABORTED";

export class AscError extends Error {
  constructor(public code: AscErrorCode, public status = 0, public appleCode?: string) { super(code); }
}

export function ascErrorCode(status: number): AscErrorCode {
  if (status === 400) return "ASC_BAD_REQUEST";
  if (status === 401) return "ASC_UNAUTHORIZED";
  if (status === 403) return "ASC_FORBIDDEN";
  if (status === 404) return "ASC_NOT_FOUND";
  if (status === 409) return "ASC_CONFLICT";
  if (status === 422) return "ASC_INVALID";
  if (status === 429) return "ASC_RATE_LIMITED";
  return "ASC_UNAVAILABLE";
}

/** HTTP status a DuoShot route answers with when an Apple call fails. */
export function ascErrorStatus(code: string): number {
  if (code === "ASC_UNAUTHORIZED" || code === "ASC_FORBIDDEN") return 424;
  if (code === "ASC_NOT_FOUND") return 404;
  if (code === "ASC_CONFLICT" || code === "ASC_INVALID" || code === "ASC_BAD_REQUEST") return 409;
  if (code === "ASC_RATE_LIMITED") return 429;
  return 502;
}

type Resource<A> = { id: string; type: string; attributes?: A };
type Document<A> = { data: Resource<A>[] | Resource<A>; links?: { next?: string } };

export type UploadOperation = {
  method: string; url: string; length: number; offset: number;
  requestHeaders?: { name: string; value: string }[];
};
export type AssetState = { state?: string; errors?: { code?: string; description?: string }[] };
type ScreenshotAttributes = { fileName?: string; uploadOperations?: UploadOperation[] | null; assetDeliveryState?: AssetState | null };

export type AscApp = { id: string; name: string; bundleId: string };
export type AscVersion = { id: string; versionString: string; state: string; platform: string };
export type AscLocalization = { id: string; locale: string };

export type AscClientOptions = {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  requestTimeoutMs?: number;
};

const ID = /^[A-Za-z0-9-]{1,64}$/;
export function isAscId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

export function md5Hex(bytes: Uint8Array): string {
  return createHash("md5").update(bytes).digest("hex");
}

export function createAscClient(credentials: AscCredentials, options: AscClientOptions = {}) {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  let token: { value: string; expiresAt: number } | null = null;

  function bearer() {
    const seconds = Math.floor(now() / 1000);
    // Renew two minutes before Apple would reject the token.
    if (!token || token.expiresAt - 120 <= seconds) {
      token = { value: signAscToken(credentials, seconds), expiresAt: seconds + 15 * 60 };
    }
    return token.value;
  }

  function signal() {
    const timeout = AbortSignal.timeout(options.requestTimeoutMs ?? 30_000);
    return options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  }

  async function send(url: string, init: RequestInit): Promise<Response> {
    if (options.signal?.aborted) throw new AscError("ASC_ABORTED");
    try { return await doFetch(url, { ...init, signal: signal() }); } catch {
      throw new AscError(options.signal?.aborted ? "ASC_ABORTED" : "ASC_UNREACHABLE");
    }
  }

  async function request<T>(method: string, pathOrUrl: string, body?: unknown): Promise<T | null> {
    const url = pathOrUrl.startsWith("https://") ? pathOrUrl : `${ASC_API_BASE}${pathOrUrl}`;
    // Pagination links come from Apple; never send the token anywhere else.
    if (!url.startsWith(`${ASC_API_BASE}/`)) throw new AscError("ASC_UNAVAILABLE");
    const response = await send(url, {
      method,
      headers: { Authorization: `Bearer ${bearer()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null) as { errors?: { code?: string }[] } | null;
    if (!response.ok) throw new AscError(ascErrorCode(response.status), response.status, payload?.errors?.[0]?.code);
    return payload as T;
  }

  async function list<A>(path: string, maxPages = 5): Promise<Resource<A>[]> {
    const out: Resource<A>[] = [];
    let next: string | undefined = path;
    for (let page = 0; next && page < maxPages; page++) {
      const document: Document<A> | null = await request<Document<A>>("GET", next);
      if (!document) break;
      out.push(...(Array.isArray(document.data) ? document.data : [document.data]));
      next = document.links?.next;
    }
    return out;
  }

  async function single<A>(method: string, path: string, body?: unknown): Promise<Resource<A>> {
    const document = await request<Document<A>>(method, path, body);
    if (!document || Array.isArray(document.data)) throw new AscError("ASC_UNAVAILABLE");
    return document.data;
  }

  const client = {
    /** Cheapest authenticated call: proves issuer, key id and private key together. */
    async verify() {
      await request("GET", "/v1/apps?limit=1&fields[apps]=name");
    },

    async listApps(): Promise<AscApp[]> {
      const apps = await list<{ name?: string; bundleId?: string }>("/v1/apps?limit=200&fields[apps]=name,bundleId&sort=name");
      return apps.map((app) => ({ id: app.id, name: app.attributes?.name ?? "", bundleId: app.attributes?.bundleId ?? "" }));
    },

    async listEditableVersions(appId: string): Promise<AscVersion[]> {
      const query = new URLSearchParams({
        "filter[platform]": "IOS",
        "filter[appVersionState]": ASC_EDITABLE_VERSION_STATES.join(","),
        "fields[appStoreVersions]": "versionString,appVersionState,platform",
        limit: "50",
      });
      const versions = await list<{ versionString?: string; appVersionState?: string; platform?: string }>(
        `/v1/apps/${encodeURIComponent(appId)}/appStoreVersions?${query}`,
      );
      return versions.map((version) => ({
        id: version.id, versionString: version.attributes?.versionString ?? "",
        state: version.attributes?.appVersionState ?? "", platform: version.attributes?.platform ?? "",
      }));
    },

    async listLocalizations(versionId: string): Promise<AscLocalization[]> {
      const localizations = await list<{ locale?: string }>(
        `/v1/appStoreVersions/${encodeURIComponent(versionId)}/appStoreVersionLocalizations?limit=50&fields[appStoreVersionLocalizations]=locale`,
      );
      return localizations.map((item) => ({ id: item.id, locale: item.attributes?.locale ?? "" }));
    },

    async ensureScreenshotSet(localizationId: string, displayType: string): Promise<string> {
      const sets = await list<{ screenshotDisplayType?: string }>(
        `/v1/appStoreVersionLocalizations/${encodeURIComponent(localizationId)}/appScreenshotSets?limit=50&fields[appScreenshotSets]=screenshotDisplayType`,
      );
      const existing = sets.find((set) => set.attributes?.screenshotDisplayType === displayType);
      if (existing) return existing.id;
      const created = await single("POST", "/v1/appScreenshotSets", {
        data: {
          type: "appScreenshotSets",
          attributes: { screenshotDisplayType: displayType },
          relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: localizationId } } },
        },
      });
      return created.id;
    },

    async listScreenshotIds(setId: string): Promise<string[]> {
      const shots = await list(`/v1/appScreenshotSets/${encodeURIComponent(setId)}/appScreenshots?limit=50&fields[appScreenshots]=fileName`);
      return shots.map((shot) => shot.id);
    },

    async deleteExistingScreenshots(setId: string): Promise<number> {
      const ids = await client.listScreenshotIds(setId);
      for (const id of ids) await request("DELETE", `/v1/appScreenshots/${encodeURIComponent(id)}`);
      return ids.length;
    },

    async reserveScreenshot(setId: string, fileName: string, fileSize: number) {
      const reserved = await single<ScreenshotAttributes>("POST", "/v1/appScreenshots", {
        data: {
          type: "appScreenshots",
          attributes: { fileName, fileSize },
          relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: setId } } },
        },
      });
      const operations = reserved.attributes?.uploadOperations ?? [];
      if (!operations.length) throw new AscError("ASC_UPLOAD_FAILED");
      return { id: reserved.id, operations };
    },

    /** PUTs each part exactly as Apple describes it: method, URL, headers and byte range. No JWT. */
    async uploadParts(operations: UploadOperation[], bytes: Uint8Array) {
      await mapLimit(operations, 3, async (operation) => {
        const end = operation.offset + operation.length;
        if (!operation.url.startsWith("https://") || operation.offset < 0 || end > bytes.byteLength) throw new AscError("ASC_UPLOAD_FAILED");
        const headers = Object.fromEntries((operation.requestHeaders ?? []).map(({ name, value }) => [name, value]));
        const body = bytes.subarray(operation.offset, end);
        for (let attempt = 0; ; attempt++) {
          let status = 0;
          try {
            const response = await send(operation.url, { method: operation.method, headers, body: body as BodyInit });
            status = response.status;
            if (response.ok) return;
          } catch (error) {
            if (error instanceof AscError && error.code === "ASC_ABORTED") throw error;
          }
          // Apple allows resending a part any time before commit; retry only transient failures.
          if (attempt >= 2 || (status >= 400 && status < 500)) throw new AscError("ASC_UPLOAD_FAILED", status);
          await sleep(500 * (attempt + 1));
        }
      });
    },

    async commitScreenshot(id: string, checksum: string) {
      await single("PATCH", `/v1/appScreenshots/${encodeURIComponent(id)}`, {
        data: { type: "appScreenshots", id, attributes: { uploaded: true, sourceFileChecksum: checksum } },
      });
    },

    async screenshotState(id: string): Promise<AssetState> {
      const shot = await single<ScreenshotAttributes>("GET", `/v1/appScreenshots/${encodeURIComponent(id)}?fields[appScreenshots]=assetDeliveryState`);
      return shot.attributes?.assetDeliveryState ?? {};
    },

    /**
     * Polls every screenshot together until each is COMPLETE or FAILED.
     * Resolves with the per-id terminal state; ids still processing at the deadline are "TIMEOUT".
     */
    async waitForScreenshots(ids: string[], { timeoutMs = 5 * 60_000, intervalMs = 3000, onState }: {
      timeoutMs?: number; intervalMs?: number; onState?: (id: string, state: string) => void;
    } = {}): Promise<Record<string, "COMPLETE" | "FAILED" | "TIMEOUT">> {
      const deadline = now() + timeoutMs;
      const settled: Record<string, "COMPLETE" | "FAILED" | "TIMEOUT"> = {};
      let pending = [...ids];
      while (pending.length) {
        const states = await mapLimit(pending, 4, async (id) => [id, (await client.screenshotState(id)).state ?? ""] as const);
        for (const [id, state] of states) {
          if (state === "COMPLETE" || state === "FAILED") { settled[id] = state; onState?.(id, state); }
        }
        pending = pending.filter((id) => !settled[id]);
        if (!pending.length) break;
        if (now() + intervalMs > deadline) { for (const id of pending) settled[id] = "TIMEOUT"; break; }
        await sleep(intervalMs);
      }
      return settled;
    },

    /** Reserve → upload parts → commit with MD5; optionally waits for Apple's processing. */
    async uploadScreenshot(setId: string, fileName: string, bytes: Uint8Array, { wait = true, timeoutMs }: { wait?: boolean; timeoutMs?: number } = {}) {
      const { id, operations } = await client.reserveScreenshot(setId, fileName, bytes.byteLength);
      await client.uploadParts(operations, bytes);
      await client.commitScreenshot(id, md5Hex(bytes));
      if (!wait) return { id, state: "UPLOAD_COMPLETE" as const };
      const state = (await client.waitForScreenshots([id], { timeoutMs }))[id];
      if (state === "FAILED") throw new AscError("ASC_PROCESSING_FAILED");
      if (state === "TIMEOUT") throw new AscError("ASC_PROCESSING_TIMEOUT");
      return { id, state };
    },

    async reorderScreenshots(setId: string, ids: string[]) {
      await request("PATCH", `/v1/appScreenshotSets/${encodeURIComponent(setId)}/relationships/appScreenshots`, {
        data: ids.map((id) => ({ type: "appScreenshots", id })),
      });
    },

    async deleteScreenshot(id: string) {
      await request("DELETE", `/v1/appScreenshots/${encodeURIComponent(id)}`);
    },
  };
  return client;
}

export type AscClient = ReturnType<typeof createAscClient>;
