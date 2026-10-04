import { ASC_MAX_SCREENSHOTS_PER_SET, ASC_PREFERRED_69_SIZE } from "@/lib/asc/config";
import type { DeviceSlot, Orientation } from "@/lib/specs";
import type { MessageKey } from "@/lib/i18n/types";

type Key = MessageKey;

/** Status from GET /api/asc/connection; null when the flag is off (404) or the user is signed out. */
export type AscToolStatus = { owner: boolean; paid: boolean; connected: boolean };

/**
 * What the Export step offers. Locked wins over not connected: a trial or free
 * workspace cannot connect a key anyway, so the first step is the plan.
 */
export type AscGate = "hidden" | "locked" | "not_connected" | "ready";

export function ascGate(status: AscToolStatus | null): AscGate {
  if (!status) return "hidden";
  if (!status.paid) return "locked";
  if (!status.connected) return "not_connected";
  return "ready";
}

export type ExportImage = { slot: string; index: number; width: number; height: number; format: string };
export type AscPlannedFile = { slot: DeviceSlot; index: number; width: number; height: number; name: string };

const DUO_SLOTS = new Set(["duo-outer", "duo-inner"]);

function fileName(image: ExportImage, orientation: Orientation): string {
  const size = image.slot === "iphone-69" ? `${image.width}x${image.height}/` : "";
  return `${image.slot}-${orientation}/${size}${String(image.index).padStart(2, "0")}.${image.format === "jpeg" ? "jpg" : "png"}`;
}

/**
 * Mirrors the worker's planAscFiles on the export's image list: the 6.9″ set at its
 * largest size only (one per slide, at most ten), every iPhone Duo file skipped.
 */
export function ascFilePlan(images: ExportImage[], orientation: Orientation): { send: AscPlannedFile[]; skipped: AscPlannedFile[] } {
  const preferred = ASC_PREFERRED_69_SIZE[orientation];
  const toPlanned = (image: ExportImage): AscPlannedFile => ({
    slot: image.slot as DeviceSlot, index: image.index, width: image.width, height: image.height, name: fileName(image, orientation),
  });
  const send = images
    .filter((image) => image.slot === "iphone-69" && `${image.width}x${image.height}` === preferred)
    .sort((a, b) => a.index - b.index)
    .slice(0, ASC_MAX_SCREENSHOTS_PER_SET)
    .map(toPlanned);
  const skipped = images.filter((image) => DUO_SLOTS.has(image.slot))
    .sort((a, b) => (a.slot === b.slot ? a.index - b.index : a.slot === "duo-outer" ? -1 : 1))
    .map(toPlanned);
  return { send, skipped };
}

/** Stable codes from /api/asc/*, the asc_upload job and the hook → user-facing message. */
const ERROR_KEYS: Record<string, Key> = {
  ASC_NOT_CONNECTED: "asct_err_not_connected",
  ASC_UNAUTHORIZED: "asct_err_credentials",
  ASC_FORBIDDEN: "asct_err_credentials",
  ASC_KEY_UNREADABLE: "asct_err_credentials",
  PAID_PLAN_REQUIRED: "asct_err_paid",
  OWNER_REQUIRED: "asct_err_owner",
  EXPORT_EXPIRED: "asct_err_expired",
  NOTHING_TO_UPLOAD: "asct_err_nothing",
  QUEUE_DISABLED: "asct_err_busy",
  RENDER_BUSY: "asct_err_busy",
  RENDER_ALREADY_PENDING: "asct_err_pending",
  RENDER_PENDING: "asct_err_timeout",
  ASC_SET_FULL: "asct_err_set_full",
  ASC_RETRY_UNSAFE: "asct_err_retry_unsafe",
  ASC_PROCESSING_FAILED: "asct_err_processing",
  ASC_PROCESSING_TIMEOUT: "asct_err_processing_timeout",
  ASC_RATE_LIMITED: "asct_err_rate_limited",
  ASC_NOT_FOUND: "asct_err_not_found",
  ASC_UPLOAD_FAILED: "asct_err_upload",
  ASC_UPLOAD_OPERATION_INVALID: "asct_err_upload",
  ASC_CONFLICT: "asct_err_upload",
  ASC_INVALID: "asct_err_upload",
  ASC_BAD_REQUEST: "asct_err_upload",
};

export function ascErrorKey(code: string | undefined): Key {
  return (code && ERROR_KEYS[code]) || "asct_err_generic";
}

/** Per-file failure detail; a cleanup failure may have left a screenshot in App Store Connect. */
export function ascFileErrorKey(code: string | undefined): Key {
  if (code === "ASC_ROLLED_BACK") return "asct_file_rolled_back";
  if (code === "ASC_CLEANUP_FAILED") return "asct_file_cleanup_failed";
  return ascErrorKey(code);
}

export function ascFileStateKey(state: string): Key {
  if (state === "uploading") return "asct_file_uploading";
  if (state === "processing") return "asct_file_processing";
  if (state === "complete") return "asct_file_complete";
  if (state === "failed") return "asct_file_failed";
  return "asct_file_pending";
}

export function ascAppUrl(appId: string): string {
  return `https://appstoreconnect.apple.com/apps/${encodeURIComponent(appId)}`;
}

/** The single option is picked for the user; otherwise they choose. */
export function autoPick<T extends { id: string }>(items: T[]): string {
  return items.length === 1 ? items[0]!.id : "";
}
