import sharp, { type Metadata } from "sharp";
import type { UploadOperation } from "@/lib/asc/client";
import type { AssetLibraryRefData } from "@/lib/asc/asset-library-refdata";
import { hasExactDimensions } from "@/lib/asc/asset-library-refdata";
import { assetHasPlacements409, awaitingImageResponse, invalidPlacement409, invalidState409, placementResponse, readyImageResponse, refDataFixture } from "./fixtures/asc-asset-library/fixtures";
import type { AppleCall } from "./asc-apple-mock";

type Data = { data: { id?: string; attributes: Record<string, unknown>; relationships: Record<string, { data: { id: string } | { id: string }[] }> } };
const relatedId = (body: Data, name: string) => (body.data.relationships[name]!.data as { id: string }).id;

/** No passthrough: every request is handled in memory, unknown routes return 404. */
export function fakeAssetLibraryApple(options: {
  refData?: AssetLibraryRefData; versionState?: string; states?: string[]; parts?: number; pageSize?: number;
  processedSpecId?: string | null | ((fileName: string) => string | null | undefined);
  existing?: Record<string, string[]>;
  operations?: UploadOperation[];
  fail?: (method: string, path: string) => { status: number; code: string } | null;
} = {}) {
  const refData = options.refData ?? refDataFixture();
  const calls: AppleCall[] = [];
  const images = new Map<string, { fileName: string; fileSize: number; received: Map<number, Uint8Array>; polls: number; deleted: boolean }>();
  const placements = new Map<string, { group: string; imageId?: string; deleted: boolean }>();
  for (const [group, ids] of Object.entries(options.existing ?? {})) for (const id of ids) placements.set(id, { group, deleted: false });
  let imageCounter = 0;
  let placementCounter = 0;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const assembled = (id: string) => Buffer.concat([...images.get(id)!.received.entries()].sort(([a], [b]) => a - b).map(([, bytes]) => bytes));
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? "GET").toUpperCase();
    const headers = Object.fromEntries(new Headers(init.headers));
    const body: unknown = typeof init.body === "string" ? JSON.parse(init.body) : init.body ?? null;
    calls.push({ method, url: url.href, headers, body });
    const path = url.pathname;
    const failure = options.fail?.(method, path);
    if (failure) {
      const fixture = failure.code === "STATE_ERROR.INVALID_STATE" ? invalidState409 : failure.code === "ENTITY_ERROR.ATTRIBUTE.INVALID" ? invalidPlacement409 : { errors: [{ status: String(failure.status), code: failure.code }] };
      return json(fixture, failure.status);
    }
    if (url.hostname === "upload.blobstore.apple.com" && method === "PUT") {
      const [, id, offset] = path.split("/");
      if (headers.authorization) throw new Error("JWT sent to blob store");
      images.get(id!)!.received.set(Number(offset), new Uint8Array(init.body as Uint8Array));
      return new Response(null, { status: 200 });
    }
    if (url.origin !== "https://api.appstoreconnect.apple.com") return json({}, 404);
    if (method === "GET" && path === "/v1/appAssetLibraryRefData") return json({ data: [{ type: "appAssetLibraryRefData", id: "ref-1", attributes: refData }] });
    if (method === "GET" && /^\/v1\/apps\/[^/]+\/assetLibrary$/.test(path)) return json({ data: { type: "appAssetLibraries", id: "library-1" } });
    const localization = path.match(/^\/v1\/appStoreVersionLocalizations\/([^/]+)$/);
    if (method === "GET" && localization && url.searchParams.get("include") === "appStoreVersion" &&
      url.searchParams.get("fields[appStoreVersions]") === "appVersionState") {
      // AppStoreVersionLocalizationResponse (OpenAPI 4.5.1); all ids are fictitious.
      return json({ data: { type: "appStoreVersionLocalizations", id: decodeURIComponent(localization[1]!),
        relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: "ver-1" } } } },
      included: [{ type: "appStoreVersions", id: "ver-1", attributes: { appVersionState: options.versionState ?? "PREPARE_FOR_SUBMISSION" } }],
      links: { self: url.href } });
    }
    if (method === "GET" && /^\/v1\/appStoreVersionLocalizations\/[^/]+\/placements$/.test(path)) {
      const group = url.searchParams.get("filter[placementGroup]");
      const all = [...placements].filter(([, p]) => !p.deleted && p.group === group).map(([id]) => ({ type: "appAssetLibraryPlacements", id }));
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const size = options.pageSize ?? 200;
      const next = new URL(url); next.searchParams.set("offset", String(offset + size));
      return json({ data: all.slice(offset, offset + size), links: { next: offset + size < all.length ? next.href : undefined } });
    }
    if (method === "POST" && path === "/v1/appAssetLibraryImages") {
      const data = body as Data;
      const { fileName, fileSize } = data.data.attributes as { fileName: string; fileSize: number };
      const id = `image-${++imageCounter}`;
      images.set(id, { fileName, fileSize, received: new Map(), polls: 0, deleted: false });
      const count = options.parts ?? 2;
      const length = Math.ceil(fileSize / count);
      const uploadOperations = options.operations ?? Array.from({ length: count }, (_, index) => ({ method: "PUT", url: `https://upload.blobstore.apple.com/${id}/${index * length}`, offset: index * length, length: Math.min(length, fileSize - index * length), requestHeaders: [{ name: "Content-Type", value: "image/png" }] }));
      return json({ data: { ...awaitingImageResponse.data, id, attributes: { ...awaitingImageResponse.data.attributes, fileName, fileSize, uploadOperations } } }, 201);
    }
    const imageMatch = path.match(/^\/v1\/appAssetLibraryImages\/([^/]+)$/);
    if (imageMatch) {
      const id = imageMatch[1]!;
      const image = images.get(id)!;
      if (method === "DELETE") {
        if ([...placements.values()].some((p) => !p.deleted && p.imageId === id)) return json(assetHasPlacements409, 409);
        image.deleted = true;
        return new Response(null, { status: 204 });
      }
      if (method === "PATCH") {
        if (JSON.stringify((body as Data).data.attributes) !== JSON.stringify({ uploaded: true })) return json({}, 422);
        if (assembled(id).byteLength !== image.fileSize) return json({}, 422);
        return json({ data: { type: "appAssetLibraryImages", id, attributes: { state: "UPLOAD_COMPLETE" } } });
      }
      const states = options.states ?? ["UPLOAD_COMPLETE", "PREPARE_FOR_SUBMISSION"];
      const state = states[Math.min(image.polls++, states.length - 1)];
      const metadata = await sharp(assembled(id)).metadata().catch(() => ({} as Metadata));
      const override = typeof options.processedSpecId === "function" ? options.processedSpecId(image.fileName) : options.processedSpecId;
      const specId = override !== undefined ? override : refData.imageSpecs?.find((spec) => hasExactDimensions(spec, metadata.width!, metadata.height!))?.specId;
      return json({ data: { ...readyImageResponse.data, id, attributes: { ...readyImageResponse.data.attributes, state, specId,
        ...(state === "FAILED" ? { stateDetails: [{ code: "INVALID_IMAGE", message: "Processing failed in memory" }] } : {}) } } });
    }
    if (method === "POST" && path === "/v1/appAssetLibraryPlacements") {
      const data = body as Data;
      const id = `placement-${++placementCounter}`;
      const group = data.data.attributes.placementGroup as string;
      placements.set(id, { group, imageId: relatedId(data, "image"), deleted: false });
      return json({ data: { ...placementResponse.data, id, attributes: { ...placementResponse.data.attributes, placementGroup: group } } }, 201);
    }
    if (method === "DELETE" && path.startsWith("/v1/appAssetLibraryPlacements/")) {
      placements.get(path.split("/").at(-1)!)!.deleted = true;
      return new Response(null, { status: 204 });
    }
    if (method === "POST" && path === "/v1/appAssetLibraryPlacementOrderingRequests") return json({ data: { type: "appAssetLibraryPlacementOrderingRequests", id: "order-1" } }, 201);
    return json({ errors: [{ code: "NOT_FOUND" }] }, 404);
  };
  return { fetch, calls, images, placements, refData, assembled };
}
