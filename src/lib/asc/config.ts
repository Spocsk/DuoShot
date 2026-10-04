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

/**
 * DuoShot output → App Store Connect `screenshotDisplayType`.
 *
 * Checked 2026-10-04 against Apple's ScreenshotDisplayType reference: the enum
 * has no iPhone Duo / foldable value, so both Duo slots stay `null` and are
 * skipped (and reported as such). Flip them here once Apple ships a value.
 *
 * The API has no `APP_IPHONE_69`: App Store Connect's 6.9" slot is the
 * `APP_IPHONE_67` set, which accepts 1320×2868, 1290×2796 and 1260×2736.
 * To be confirmed by the first end-to-end upload.
 */
export const ASC_DISPLAY_TYPES: Record<DeviceSlot, string | null> = {
  "duo-outer": null,
  "duo-inner": null,
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
