import type { AssetLibraryRefData, ImageSpec } from "@/lib/asc/asset-library-refdata";

/**
 * Shape: App Store Connect API OpenAPI 4.5.1, AppAssetLibraryRefDatum,
 * AppAssetLibraryImage*, AppAssetLibraryPlacement*, confirmed field-by-field
 * against the Apple schema reference and these guides:
 * https://developer.apple.com/documentation/appstoreconnectapi/discovering-asset-specifications
 * https://developer.apple.com/documentation/appstoreconnectapi/uploading-and-managing-image-assets
 * https://developer.apple.com/documentation/appstoreconnectapi/placing-assets-on-your-app-store-surfaces
 * https://developer.apple.com/documentation/appstoreconnectapi/download-and-read-the-openapi-specification
 *
 * Duo values are REAL, read 2026-10-30 from GET /v1/appAssetLibraryRefData on a
 * live App Store Connect team key (no secrets in the response):
 *  - group IPHONE_DUO_PROFILE / displayClass IPHONE_DUO / platform IPHONE_APP_STORE,
 *  - the four Duo imageSpec UUIDs and their exact (min==max) dimensions below,
 *  - displayClass IPHONE_DUO screenDimensions ["2853x2007","2034x1398"] (both
 *    sizes are ACCEPTED, neither is independently required),
 *  - APP_SCREENSHOT groupLimits: a single policy entry whose groupIds lists all
 *    iPhone/iPad/Duo groups with maxCount 10. The entry here is reduced to the
 *    two groups these tests exercise; see placementLimit() for the per-group
 *    reading of that shared entry.
 * Spec shortNames follow Apple's i{w}x{h}a0 convention (illustrative; the exact
 * strings are only used in error messages). The IPHONE_DYNAMIC_ISLAND_LARGE
 * (6.9") group, its specs, and the 1290×2796 UUID remain illustrative/documented
 * placeholders — the real 6.9" group was not part of this Duo-focused read.
 */
const imageSpec = (specId: string, width: number, height: number): ImageSpec => ({
  specId, shortName: `i${width}x${height}a0`, dimensions: { minWidth: width, maxWidth: width, minHeight: height, maxHeight: height },
  aspectRatio: `${width}:${height}`, compatiblePlacementTypes: ["APP_SCREENSHOT"], alphaAllowed: false,
  fileExtensions: [".jpg", ".jpeg", ".png"], mimeTypes: ["image/jpeg", "image/png"], maxFileSize: 524288000, universalAsset: false,
});

const PHONE_69_GROUP = "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE";

export function refDataFixture(duoGroup = "IPHONE_DUO_PROFILE", maxCount: number | null = 10): AssetLibraryRefData {
  // Real Duo spec UUIDs (indices 0-3 kept in this dimensional order so the
  // mismatch tests can address "écran externe" vs "interne" by index).
  const imageSpecs = [
    imageSpec("205e7ab6-a23a-4ee2-b327-0a99ec2a2520", 1398, 2034),
    imageSpec("47d5a794-c036-4342-8923-988990c81af9", 2034, 1398),
    imageSpec("5d458eef-8339-4a1f-a484-83d53834cfec", 2007, 2853),
    imageSpec("b83915b8-5b87-4e63-bba5-ab3a0c439862", 2853, 2007),
    imageSpec("af132000-2868-5000-9000-000000000005", 1320, 2868),
    imageSpec("af286800-1320-5000-9000-000000000006", 2868, 1320),
    imageSpec("f56c777c-99ea-5760-97ae-27c5f8cbb884", 1290, 2796),
  ];
  return {
    // One shared APP_SCREENSHOT policy entry listing every iPhone/iPad/Duo group
    // under a single maxCount, as the live refData returns it.
    features: [{ featureId: "APP_STORE_VERSIONS", placementPolicies: [{ placementType: "APP_SCREENSHOT",
      groupLimits: maxCount === null ? [] : [{ groupIds: [duoGroup, PHONE_69_GROUP], maxCount }] }] }],
    placementProfileGroups: [
      { placementProfileGroupId: duoGroup, displayClassId: "IPHONE_DUO", platform: "IPHONE_APP_STORE" },
      { placementProfileGroupId: PHONE_69_GROUP, displayClassId: "IPHONE_DYNAMIC_ISLAND_LARGE_DISPLAY", platform: "IPHONE_APP_STORE" },
    ],
    imageSpecs, videoSpecs: [],
    placementTypes: [{ placementTypeId: "APP_SCREENSHOT", acceptsAssetCategories: ["APP_SCREENSHOTS_AND_PREVIEWS"], specMappings: [
      { placementGroupId: duoGroup, specs: imageSpecs.slice(0, 4).map((spec) => spec.specId!) },
      { placementGroupId: PHONE_69_GROUP, specs: imageSpecs.slice(4).map((spec) => spec.specId!) },
    ] }],
    displayClasses: [
      { displayClassId: "IPHONE_DUO", deviceFamily: "IPHONE", screenDimensions: ["2853x2007", "2034x1398"] },
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
