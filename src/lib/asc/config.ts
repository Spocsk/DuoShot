import type { DeviceSlot, Orientation } from "../specs";
import { serverEnv } from "../env";

/** Every App Store Connect surface stays hidden until the operator opts in. */
export function ascConnectorEnabled(): boolean {
  return serverEnv.asc.enabled;
}

export const ASC_API_BASE = "https://api.appstoreconnect.apple.com";
export const ASC_AUDIENCE = "appstoreconnect-v1";
/** Apple rejects tokens that expire more than 20 minutes after issue. */
export const ASC_TOKEN_TTL_SECONDS = 15 * 60;
/** Apple accepts at most ten screenshots per display type and localization. */
export const ASC_MAX_SCREENSHOTS_PER_SET = 10;

/**
 * App Store version states in which screenshots can still be changed.
 * See docs/app-store-connect.md for the Apple references.
 */
export const ASC_EDITABLE_VERSION_STATES = [
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
] as const;

/** Both Duo screen sizes share APP_IPHONE_DUO. Runtime evidence is documented
 * in docs/app-store-connect.md; uploads have not yet been tested by DuoShot.
 */
export const ASC_DISPLAY_TYPES: Record<DeviceSlot, string | null> = {
  "duo-outer": "APP_IPHONE_DUO",
  "duo-inner": "APP_IPHONE_DUO",
  "iphone-69": "APP_IPHONE_67",
};

/** The ZIP carries three 6.9" sizes; one set needs only one, the largest. */
export const ASC_PREFERRED_69_SIZE: Record<Orientation, string> = {
  portrait: "1320x2868",
  landscape: "2868x1320",
};

export function displayTypeFor(slot: DeviceSlot): string | null {
  return ASC_DISPLAY_TYPES[slot];
}
