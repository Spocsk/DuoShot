import type { AssetLibraryRefData, ImageSpec } from "@/lib/asc/asset-library-refdata";

/**
 * Sources: App Store Connect API OpenAPI 4.5.1, AppAssetLibraryRefDatum,
 * AppAssetLibraryImage*, AppAssetLibraryPlacement*, and the exact Apple guides:
 * https://developer.apple.com/documentation/appstoreconnectapi/discovering-asset-specifications
 * https://developer.apple.com/documentation/appstoreconnectapi/uploading-and-managing-image-assets
 * https://developer.apple.com/documentation/appstoreconnectapi/placing-assets-on-your-app-store-surfaces
 * https://developer.apple.com/documentation/appstoreconnectapi/download-and-read-the-openapi-specification
 * Local OpenAPI excerpt provenance: rorkai/App-Store-Connect-CLI,
 * docs/openapi/latest.json @1f98949 (Apple OpenAPI 4.5.1).
 * Duo group and spec IDs below are FICTITIOUS, not confirmed by Apple.
 * Only the 1290×2796 UUID and IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE are documented.
 */
const imageSpec = (specId: string, width: number, height: number): ImageSpec => ({
  specId, shortName: `i${width}x${height}a0`, dimensions: { minWidth: width, maxWidth: width, minHeight: height, maxHeight: height },
  aspectRatio: `${width}:${height}`, compatiblePlacementTypes: ["APP_SCREENSHOT"], alphaAllowed: false,
  fileExtensions: [".jpg", ".jpeg", ".png"], mimeTypes: ["image/jpeg", "image/png"], maxFileSize: 524288000, universalAsset: false,
});

export function refDataFixture(duoGroup = "IPHONE_DUO_PROFILE", maxCount: number | null = 10): AssetLibraryRefData {
  const imageSpecs = [
    imageSpec("af139800-2034-5000-9000-000000000001", 1398, 2034),
    imageSpec("af203400-1398-5000-9000-000000000002", 2034, 1398),
    imageSpec("af200700-2853-5000-9000-000000000003", 2007, 2853),
    imageSpec("af285300-2007-5000-9000-000000000004", 2853, 2007),
    imageSpec("af132000-2868-5000-9000-000000000005", 1320, 2868),
    imageSpec("af286800-1320-5000-9000-000000000006", 2868, 1320),
    imageSpec("f56c777c-99ea-5760-97ae-27c5f8cbb884", 1290, 2796),
  ];
  return {
    features: [{ featureId: "APP_STORE_VERSIONS", placementPolicies: [{ placementType: "APP_SCREENSHOT", groupLimits: [
      ...(maxCount === null ? [] : [{ groupIds: [duoGroup], maxCount }]),
      { groupIds: ["IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE"], maxCount: 10 },
    ] }] }],
    placementProfileGroups: [
      { placementProfileGroupId: duoGroup, displayClassId: "IPHONE_DUO", platform: "IPHONE_APP_STORE" },
      { placementProfileGroupId: "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE", displayClassId: "IPHONE_DYNAMIC_ISLAND_LARGE_DISPLAY", platform: "IPHONE_APP_STORE" },
    ],
    imageSpecs, videoSpecs: [],
    placementTypes: [{ placementTypeId: "APP_SCREENSHOT", acceptsAssetCategories: ["APP_SCREENSHOTS_AND_PREVIEWS"], specMappings: [
      { placementGroupId: duoGroup, specs: imageSpecs.slice(0, 4).map((spec) => spec.specId!) },
      { placementGroupId: "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE", specs: imageSpecs.slice(4).map((spec) => spec.specId!) },
    ] }],
    displayClasses: [
      { displayClassId: "IPHONE_DUO", deviceFamily: "IPHONE", screenDimensions: ["1398x2034", "2007x2853"] },
      { displayClassId: "IPHONE_DYNAMIC_ISLAND_LARGE_DISPLAY", deviceFamily: "IPHONE", screenDimensions: ["1320x2868"] },
    ],
  };
}

export const refDataResponse = { data: [{ type: "appAssetLibraryRefData", id: "ref-1", attributes: refDataFixture() }] };
export const awaitingImageResponse = { data: { type: "appAssetLibraryImages", id: "image-example", attributes: {
  category: "APP_SCREENSHOTS_AND_PREVIEWS", fileName: "outer.png", fileSize: 8, state: "AWAITING_UPLOAD", specId: null, imageAsset: null, stateDetails: null,
  uploadOperations: [{ method: "PUT", url: "https://upload.blobstore.apple.com/image-example/0", offset: 0, length: 8, requestHeaders: [{ name: "Content-Type", value: "image/png" }] }],
} } };
export const readyImageResponse = { data: { type: "appAssetLibraryImages", id: "image-example", attributes: {
  state: "PREPARE_FOR_SUBMISSION", specId: refDataFixture().imageSpecs![0]!.specId, stateDetails: null,
  imageAsset: { templateUrl: "https://is1.mzstatic.com/image/thumb/example/{w}x{h}bb.{f}", width: 1398, height: 2034 },
} } };
export const placementResponse = { data: { type: "appAssetLibraryPlacements", id: "placement-example", attributes: {
  mediaType: "IMAGE", placementType: "APP_SCREENSHOT", placementGroup: "IPHONE_DUO_PROFILE", state: "PARENT_PREPARE_FOR_SUBMISSION", stateDetails: null,
} } };
export const invalidPlacement409 = { errors: [{ status: "409", code: "ENTITY_ERROR.ATTRIBUTE.INVALID",
  title: "The provided entity includes an attribute with an invalid value", detail: "The requested 'placementType' and 'placementGroup' combination is not supported for this parent.", source: { pointer: "/data/attributes/placementType" } }] };
export const invalidState409 = { errors: [{ status: "409", code: "STATE_ERROR.INVALID_STATE",
  title: "Creating a placement is not permitted in AppCustomProductPageVersion's current state", meta: { state: "approved", feature: "ASC_FEATURE_CUSTOM_PRODUCT_PAGES" } }] };
export const assetHasPlacements409 = { errors: [{ status: "409", code: "STATE_ERROR.ASSET_HAS_PLACEMENTS",
  detail: "The asset cannot be deleted while placements still use it. Delete those placements first." }] };
