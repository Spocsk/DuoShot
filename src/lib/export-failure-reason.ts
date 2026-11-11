/**
 * Known export/render error codes emitted by the client and the render API.
 * Any Umami `export_failed` reason must come from this allowlist so the funnel
 * never ingests free-form browser error text (e.g. "Load failed").
 */
const KNOWN_EXPORT_FAILURE_CODES = new Set<string>([
  "AUTH_REQUIRED",
  "IPHONE_69_GATED",
  "TRIAL_EXHAUSTED",
  "QUALITY_ACK_REQUIRED",
  "CLONE_RISK",
  "DUO_SLOT_LIMIT",
  "DUO_SELECTION_EMPTY",
  "INVALID_DUO_SELECTION",
  "INPUT_TOO_LARGE",
  "BATCH_TOO_LARGE",
  "UPLOAD_FAILED",
  "UPLOAD_MISSING",
  "NO_IMAGES",
  "DAILY_LIMIT",
  "RENDER_BUSY",
  "RENDER_PENDING",
  "RENDER_ALREADY_PENDING",
  "RENDER_INTERRUPTED",
  "RENDER_UNAVAILABLE",
  "RENDER_GEOMETRY_TOO_LARGE",
  "EXPORT_TOO_LARGE",
  "EXPORT_UNAVAILABLE",
  "EXPORT_FAILED",
  "STORAGE_UNAVAILABLE",
  "IDEMPOTENCY_CONFLICT",
  "NO_WORKSPACE",
]);

/**
 * Maps an arbitrary error value to a stable Umami `export_failed` reason.
 * Returns the code verbatim when it is a recognised failure code, otherwise
 * "network_or_storage" — never raw browser error text.
 */
export function exportFailureReason(code: unknown): string {
  return typeof code === "string" && KNOWN_EXPORT_FAILURE_CODES.has(code)
    ? code
    : "network_or_storage";
}
