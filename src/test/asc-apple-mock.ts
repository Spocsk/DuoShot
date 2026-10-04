import { createHash } from "node:crypto";

export type AppleCall = { method: string; url: string; headers: Record<string, string>; body: unknown };

/**
 * In-memory App Store Connect API: screenshot sets, the reserve → parts → commit
 * upload flow and asset processing states. `states` is the sequence each
 * screenshot reports after commit (the last value repeats).
 */
export function fakeApple(options: {
  parts?: number;
  states?: string[];
  existing?: Record<string, string[]>;
  sets?: { id: string; displayType: string }[];
  fail?: (method: string, path: string) => { status: number; code: string } | null;
} = {}) {
  const calls: AppleCall[] = [];
  const sets = [...(options.sets ?? [])];
  const existing: Record<string, string[]> = { ...options.existing };
  const shots = new Map<string, { set: string; fileName: string; fileSize: number; received: Map<number, Uint8Array>; checksum?: string; polls: number }>();
  let counter = 0;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const method = (init.method ?? "GET").toUpperCase();
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>));
    const raw = init.body;
    const body = typeof raw === "string" ? JSON.parse(raw) : raw ?? null;
    calls.push({ method, url, headers, body });
    const parsed = new URL(url);
    const path = parsed.pathname;
    const failure = options.fail?.(method, path);
    if (failure) return json({ errors: [{ status: String(failure.status), code: failure.code, title: "nope" }] }, failure.status);

    if (parsed.host === "upload.blobstore.apple.com") {
      const [, id, offset] = path.split("/");
      shots.get(id!)!.received.set(Number(offset), new Uint8Array(raw as Uint8Array));
      return new Response(null, { status: 200 });
    }
    if (method === "GET" && path === "/v1/apps") {
      return json({ data: [{ id: "app-1", type: "apps", attributes: { name: "Harbor", bundleId: "com.example.harbor" } }] });
    }
    let match: RegExpMatchArray | null;
    if ((match = path.match(/^\/v1\/appStoreVersionLocalizations\/([^/]+)\/appScreenshotSets$/))) {
      return json({ data: sets.map((set) => ({ id: set.id, type: "appScreenshotSets", attributes: { screenshotDisplayType: set.displayType } })) });
    }
    if (method === "POST" && path === "/v1/appScreenshotSets") {
      const set = { id: `set-${++counter}`, displayType: (body as { data: { attributes: { screenshotDisplayType: string } } }).data.attributes.screenshotDisplayType };
      sets.push(set);
      return json({ data: { id: set.id, type: "appScreenshotSets", attributes: { screenshotDisplayType: set.displayType } } }, 201);
    }
    if ((match = path.match(/^\/v1\/appScreenshotSets\/([^/]+)\/appScreenshots$/))) {
      const ids = existing[match[1]!] ?? [];
      return json({ data: ids.map((id) => ({ id, type: "appScreenshots" })) });
    }
    if ((match = path.match(/^\/v1\/appScreenshotSets\/([^/]+)\/relationships\/appScreenshots$/))) return new Response(null, { status: 204 });
    if (method === "POST" && path === "/v1/appScreenshots") {
      const { attributes, relationships } = (body as { data: { attributes: { fileName: string; fileSize: number }; relationships: { appScreenshotSet: { data: { id: string } } } } }).data;
      const id = `shot-${++counter}`;
      shots.set(id, { set: relationships.appScreenshotSet.data.id, fileName: attributes.fileName, fileSize: attributes.fileSize, received: new Map(), polls: 0 });
      const parts = options.parts ?? 1;
      const size = Math.ceil(attributes.fileSize / parts);
      const uploadOperations = Array.from({ length: parts }, (_, index) => ({
        method: "PUT", url: `https://upload.blobstore.apple.com/${id}/${index * size}`, offset: index * size,
        length: Math.min(size, attributes.fileSize - index * size),
        requestHeaders: [{ name: "Content-Type", value: "image/png" }],
      }));
      return json({ data: { id, type: "appScreenshots", attributes: { ...attributes, uploadOperations, assetDeliveryState: { state: "AWAITING_UPLOAD" } } } }, 201);
    }
    if ((match = path.match(/^\/v1\/appScreenshots\/([^/]+)$/))) {
      const id = match[1]!;
      if (method === "DELETE") {
        for (const key of Object.keys(existing)) existing[key] = existing[key]!.filter((value) => value !== id);
        return new Response(null, { status: 204 });
      }
      const shot = shots.get(id)!;
      if (method === "PATCH") {
        shot.checksum = (body as { data: { attributes: { sourceFileChecksum: string } } }).data.attributes.sourceFileChecksum;
        return json({ data: { id, type: "appScreenshots", attributes: { assetDeliveryState: { state: "UPLOAD_COMPLETE" } } } });
      }
      const states = options.states ?? ["COMPLETE"];
      const state = states[Math.min(shot.polls++, states.length - 1)];
      return json({ data: { id, type: "appScreenshots", attributes: { assetDeliveryState: { state } } } });
    }
    return json({ errors: [{ status: "404", code: "NOT_FOUND" }] }, 404);
  };

  /** Reassembles what Apple received for a screenshot, in offset order. */
  const assembled = (id: string) => {
    const shot = shots.get(id)!;
    const chunks = [...shot.received.entries()].sort(([a], [b]) => a - b).map(([, bytes]) => bytes);
    return Buffer.concat(chunks);
  };
  const md5 = (bytes: Uint8Array) => createHash("md5").update(bytes).digest("hex");
  return { fetch: fetch as typeof globalThis.fetch, calls, shots, sets, existing, assembled, md5 };
}
