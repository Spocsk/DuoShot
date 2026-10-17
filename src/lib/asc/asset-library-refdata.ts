import { DUO_SLOT_MAX } from "../duo-selection";
import { SIZE_SPECS } from "../specs";
import { AscError } from "./client";

// Only documented enums are constants. Group and spec identifiers come from refData.
export const SCREENSHOT = "APP_SCREENSHOT";
export const SCREENSHOT_CATEGORY = "APP_SCREENSHOTS_AND_PREVIEWS";
export const VERSION_FEATURE = "APP_STORE_VERSIONS";
export const DUO_DISPLAY_CLASS = "IPHONE_DUO";

type Dimensions = { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number };
export type ImageSpec = {
  specId?: string; shortName?: string; dimensions?: Dimensions;
  compatiblePlacementTypes?: string[]; aspectRatio?: string; alphaAllowed?: boolean;
  fileExtensions?: string[]; mimeTypes?: string[]; maxFileSize?: number; universalAsset?: boolean;
};
/** AppAssetLibraryRefDatum attributes, OpenAPI 4.5.1 (six parallel arrays). */
export type AssetLibraryRefData = {
  features?: { featureId?: string; placementPolicies?: { placementType?: string; groupLimits?: { groupIds?: string[]; maxCount?: number }[] }[] }[];
  placementProfileGroups?: { placementProfileGroupId?: string; platform?: string; displayClassId?: string }[];
  imageSpecs?: ImageSpec[];
  videoSpecs?: (ImageSpec & { frameRates?: { minFps?: number; maxFps?: number }[]; duration?: { min?: string; max?: string }; audioRequired?: boolean })[];
  placementTypes?: { placementTypeId?: string; acceptsAssetCategories?: string[]; specMappings?: { placementGroupId?: string; specs?: string[] }[] }[];
  displayClasses?: { displayClassId?: string; deviceFamily?: string; screenDimensions?: string[] }[];
};

function screenshotType(ref: AssetLibraryRefData) {
  const type = ref.placementTypes?.find((item) => item.placementTypeId === SCREENSHOT);
  if (!type?.acceptsAssetCategories?.includes(SCREENSHOT_CATEGORY)) {
    throw new AscError("ASC_REFDATA_CATEGORY_INVALID", 0, undefined, `${SCREENSHOT} n’accepte pas ${SCREENSHOT_CATEGORY}.`);
  }
  return type;
}

export function groupImageSpecs(ref: AssetLibraryRefData, group: string): ImageSpec[] {
  const mapping = screenshotType(ref).specMappings?.find((item) => item.placementGroupId === group);
  if (!mapping) throw new AscError("ASC_REFDATA_GROUP_NOT_FOUND", 0, undefined, `Groupe ${group} absent des specMappings de ${SCREENSHOT}.`);
  return (mapping.specs ?? []).map((id) => {
    const spec = ref.imageSpecs?.find((item) => item.specId === id);
    if (!spec) throw new AscError("ASC_REFDATA_SPEC_NOT_FOUND", 0, undefined, `Spec ${id} absente de imageSpecs (groupe ${group}).`);
    return spec;
  });
}

export function hasExactDimensions(spec: ImageSpec, width: number, height: number): boolean {
  const d = spec.dimensions;
  return !!d && d.minWidth === width && d.maxWidth === width && d.minHeight === height && d.maxHeight === height;
}

export function expectedImageSpec(ref: AssetLibraryRefData, group: string, width: number, height: number): ImageSpec & { specId: string } {
  const spec = groupImageSpecs(ref, group).find((item) => item.specId && hasExactDimensions(item, width, height));
  if (!spec?.specId) throw new AscError("ASC_REFDATA_SPEC_NOT_FOUND", 0, undefined, `Aucune spec exacte ${width}×${height} dans le groupe ${group}.`);
  return { ...spec, specId: spec.specId };
}

/** iOS is IPHONE_APP_STORE in AppAssetLibraryPlacementPlatform, not IOS. */
export function resolveDuoGroup(ref: AssetLibraryRefData): string {
  screenshotType(ref);
  const group = ref.placementProfileGroups?.find((item) => item.displayClassId === DUO_DISPLAY_CLASS && item.platform === "IPHONE_APP_STORE")?.placementProfileGroupId;
  if (!group) throw new AscError("ASC_REFDATA_GROUP_NOT_FOUND", 0, undefined, `Groupe ${SCREENSHOT} / ${DUO_DISPLAY_CLASS} / iOS introuvable.`);
  groupImageSpecs(ref, group);
  return group;
}

/** The 6.9-inch target is discovered from the actual file dimensions. */
export function resolveImageGroup(ref: AssetLibraryRefData, width: number, height: number): string {
  const mappings = screenshotType(ref).specMappings ?? [];
  const group = ref.placementProfileGroups?.find((item) => item.platform === "IPHONE_APP_STORE" &&
    mappings.some((mapping) => mapping.placementGroupId === item.placementProfileGroupId &&
      mapping.specs?.some((id) => ref.imageSpecs?.some((spec) => spec.specId === id && hasExactDimensions(spec, width, height)))));
  if (!group?.placementProfileGroupId) throw new AscError("ASC_REFDATA_GROUP_NOT_FOUND", 0, undefined, `Groupe iOS ${SCREENSHOT} pour ${width}×${height} introuvable.`);
  return group.placementProfileGroupId;
}

export function placementLimit(ref: AssetLibraryRefData, group: string): number | undefined {
  const feature = ref.features?.find((item) => item.featureId === VERSION_FEATURE);
  if (!feature) throw new AscError("ASC_REFDATA_FEATURE_NOT_FOUND", 0, undefined, `Feature ${VERSION_FEATURE} indisponible.`);
  const limits = feature.placementPolicies?.filter((item) => item.placementType === SCREENSHOT)
    .flatMap((policy) => policy.groupLimits ?? []).filter((limit) => limit.groupIds?.includes(group))
    .map((limit) => limit.maxCount).filter((value): value is number => value !== undefined && Number.isInteger(value) && value >= 0);
  return limits?.length ? Math.min(...limits) : undefined;
}

/** Without reference data (or a group limit), keep the existing local guard. */
export function duoSlotLimit(ref?: AssetLibraryRefData, group?: string): number {
  return ref && group ? placementLimit(ref, group) ?? DUO_SLOT_MAX : DUO_SLOT_MAX;
}

function screenFor(spec: ImageSpec): string {
  const size = SIZE_SPECS.find((size) => hasExactDimensions(spec, size.width, size.height));
  return size?.slot === "duo-outer" ? "écran externe" : size?.slot === "duo-inner" ? "écran interne" : size?.slot === "iphone-69" ? "écran iPhone 6,9″" : "écran inconnu";
}

function describeSpec(spec: ImageSpec): string {
  const d = spec.dimensions;
  return `${spec.shortName ?? spec.specId ?? "spec inconnue"} (${d?.minWidth ?? "?"}×${d?.minHeight ?? "?"}, ${screenFor(spec)})`;
}

export function verifyImageSpec(ref: AssetLibraryRefData, group: string, expected: ImageSpec & { specId: string }, receivedId?: string | null): void {
  const received = ref.imageSpecs?.find((spec) => spec.specId === receivedId);
  if (!received || receivedId !== expected.specId || !groupImageSpecs(ref, group).some((spec) => spec.specId === receivedId) ||
    !hasExactDimensions(received, expected.dimensions!.minWidth!, expected.dimensions!.minHeight!)) {
    throw new AscError("ASC_SPEC_MISMATCH", 0, undefined,
      `Spec attendue : ${describeSpec(expected)} pour ${group} ; spec reçue : ${received ? describeSpec(received) : receivedId ? `${receivedId} (inconnue dans la refData)` : "absente"}.`);
  }
}
