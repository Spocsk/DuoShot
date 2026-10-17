import { AscError, createAscTransport, type AscClientOptions, type UploadOperation } from "./client";
import type { AscCredentials } from "./jwt";
import { SCREENSHOT, SCREENSHOT_CATEGORY, verifyImageSpec, type AssetLibraryRefData, type ImageSpec } from "./asset-library-refdata";

export type LibraryImage = {
  id: string; type: string;
  attributes?: { state?: string; stateDetails?: unknown; specId?: string | null; uploadOperations?: UploadOperation[] | null };
};
const relation = (type: string, id: string) => ({ data: { type, id } });
const imagePath = (id: string) => `/v1/appAssetLibraryImages/${encodeURIComponent(id)}`;

export function createAssetLibraryClient(credentials: AscCredentials, options: AscClientOptions & { deadline?: number } = {}) {
  const { request, single, list, now, sleep, checkDeadline } = createAscTransport(credentials, options, {
    rejectRedirects: true, requireCompletePagination: true, deadline: options.deadline,
  });
  const client = {
    async getRefData(): Promise<AssetLibraryRefData> {
      const document = await request<{ data: { attributes?: AssetLibraryRefData }[] }>("GET", "/v1/appAssetLibraryRefData");
      const attributes = document?.data?.length === 1 ? document.data[0]?.attributes : undefined;
      if (!attributes || ![attributes.features, attributes.placementProfileGroups, attributes.imageSpecs, attributes.videoSpecs, attributes.placementTypes, attributes.displayClasses].every(Array.isArray)) {
        throw new AscError("ASC_REFDATA_INVALID", 0, undefined, "La refData doit contenir un AppAssetLibraryRefDatum et ses six tableaux.");
      }
      return attributes;
    },

    async getAssetLibraryId(appId: string): Promise<string> {
      return (await single("GET", `/v1/apps/${encodeURIComponent(appId)}/assetLibrary`)).id;
    },

    async ensureVersionEditable(localizationId: string): Promise<void> {
      // OpenAPI 4.5.1: AppStoreVersionLocalizationResponse includes the parent
      // version alongside the localization, not at a /appStoreVersion route.
      const document = await request<{
        data: { relationships?: { appStoreVersion?: { data?: { type: string; id: string } } } };
        included?: { type: string; id: string; attributes?: { appVersionState?: string } }[];
      }>("GET", `/v1/appStoreVersionLocalizations/${encodeURIComponent(localizationId)}?include=appStoreVersion&fields[appStoreVersions]=appVersionState`);
      checkDeadline();
      const related = document?.data?.relationships?.appStoreVersion?.data;
      const version = related?.type === "appStoreVersions" ? document?.included?.find(
        (item) => item.type === related.type && item.id === related.id,
      ) : undefined;
      if (version?.attributes?.appVersionState !== "PREPARE_FOR_SUBMISSION") {
        throw new AscError("ASC_VERSION_NOT_EDITABLE", 409, undefined, `La version doit être PREPARE_FOR_SUBMISSION (état reçu : ${version?.attributes?.appVersionState ?? "absent"}).`);
      }
    },

    async uploadImage(input: {
      libraryId: string; fileName: string; bytes: Uint8Array; referenceName?: string;
      refData: AssetLibraryRefData; group: string; expectedSpec: ImageSpec & { specId: string };
      timeoutMs?: number; intervalMs?: number;
      onReserved?: (id: string) => void; onProcessing?: () => void | Promise<void>;
    }): Promise<LibraryImage> {
      // Include reservation and transfer time in the worker's remaining budget.
      const deadline = Math.min(options.deadline ?? Infinity, now() + (input.timeoutMs ?? 5 * 60_000));
      const { single, uploadParts, checkDeadline } = createAscTransport(credentials, options, { rejectRedirects: true, deadline });
      checkDeadline();
      const reserved = await single<NonNullable<LibraryImage["attributes"]>>("POST", "/v1/appAssetLibraryImages", { data: {
        type: "appAssetLibraryImages",
        attributes: { fileName: input.fileName, fileSize: input.bytes.byteLength, category: SCREENSHOT_CATEGORY,
          ...(input.referenceName !== undefined ? { referenceName: input.referenceName } : {}) },
        relationships: { assetLibrary: relation("appAssetLibraries", input.libraryId) },
      } });
      input.onReserved?.(reserved.id);
      checkDeadline();
      const operations = reserved.attributes?.uploadOperations ?? [];
      // Reject malformed ranges and credential headers before any part is sent.
      if (operations.some((op) => !Number.isSafeInteger(op.offset) || !Number.isSafeInteger(op.length) || op.offset < 0 || op.length <= 0 ||
        op.offset + op.length > input.bytes.byteLength || op.requestHeaders?.some((header) => /^(authorization|proxy-authorization)$/i.test(header.name.trim())))) {
        throw new AscError("ASC_UPLOAD_OPERATION_INVALID");
      }
      await uploadParts(operations, input.bytes);
      checkDeadline();
      await single("PATCH", imagePath(reserved.id), { data: { type: "appAssetLibraryImages", id: reserved.id, attributes: { uploaded: true } } });
      checkDeadline();
      await input.onProcessing?.();
      checkDeadline();
      const interval = input.intervalMs ?? 3000;
      for (;;) {
        checkDeadline();
        const image: LibraryImage = await single("GET", imagePath(reserved.id));
        checkDeadline();
        const state = image.attributes?.state;
        if (state === "FAILED") throw new AscError("ASC_PROCESSING_FAILED", 0, undefined, "Le traitement de l’image a échoué.", image.attributes?.stateDetails);
        // https://developer.apple.com/documentation/appstoreconnectapi/uploading-and-managing-image-assets
        // says PREPARE_FOR_SUBMISSION is ready; OpenAPI 4.5.1 also has COMPLETE.
        // Until a real upload resolves this ambiguity, accept both processed states.
        if (state === "PREPARE_FOR_SUBMISSION" || state === "COMPLETE") {
          verifyImageSpec(input.refData, input.group, input.expectedSpec, image.attributes?.specId);
          return image;
        }
        if (now() + interval > deadline) throw new AscError("ASC_PROCESSING_TIMEOUT");
        await sleep(interval);
      }
    },

    async createPlacement(localizationId: string, group: string, imageId: string): Promise<string> {
      try {
        return (await single("POST", "/v1/appAssetLibraryPlacements", { data: {
          type: "appAssetLibraryPlacements", attributes: { placementType: SCREENSHOT, placementGroup: group },
          relationships: { image: relation("appAssetLibraryImages", imageId), appStoreVersionLocalization: relation("appStoreVersionLocalizations", localizationId) },
        } })).id;
      } catch (error) {
        if (error instanceof AscError && error.status === 409) {
          if (error.appleCode === "STATE_ERROR.INVALID_STATE") throw new AscError("ASC_VERSION_NOT_EDITABLE", 409, error.appleCode);
          if (error.appleCode === "ENTITY_ERROR.ATTRIBUTE.INVALID") throw new AscError("ASC_PLACEMENT_INVALID", 409, error.appleCode);
        }
        throw error;
      }
    },

    async listPlacements(localizationId: string, group: string): Promise<string[]> {
      const query = new URLSearchParams({ "filter[placementType]": SCREENSHOT, "filter[placementGroup]": group, sort: "placementGroupPosition", limit: "200" });
      return (await list(`/v1/appStoreVersionLocalizations/${encodeURIComponent(localizationId)}/placements?${query}`)).map((placement) => placement.id);
    },

    async setOrder(localizationId: string, group: string, ids: string[]): Promise<void> {
      await request("POST", "/v1/appAssetLibraryPlacementOrderingRequests", { data: {
        type: "appAssetLibraryPlacementOrderingRequests", attributes: { placementGroup: group },
        relationships: { orderedPlacements: { data: ids.map((id) => ({ type: "appAssetLibraryPlacements", id })) },
          appStoreVersionLocalization: relation("appStoreVersionLocalizations", localizationId) },
      } });
    },

    async deletePlacement(id: string): Promise<void> {
      await request("DELETE", `/v1/appAssetLibraryPlacements/${encodeURIComponent(id)}`);
    },

    async deleteImage(id: string): Promise<void> {
      try { await request("DELETE", imagePath(id)); } catch (error) {
        if (error instanceof AscError && error.appleCode === "STATE_ERROR.ASSET_HAS_PLACEMENTS") throw new AscError("ASC_ASSET_HAS_PLACEMENTS", error.status, error.appleCode);
        throw error;
      }
    },
  };
  return client;
}
