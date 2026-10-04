import type { Translator } from "@/lib/i18n/types";

export function explainError({ t }: Translator, code: string) {
  if (code === "AUTH_REQUIRED") return t("error_auth");
  if (code === "TRIAL_EXHAUSTED") return t("error_trial");
  if (code === "DAILY_LIMIT") return t("error_daily");
  if (code === "IPHONE_69_GATED") return t("error_69");
  if (code === "CLONE_RISK") return t("error_clone");
  if (code === "STUDIO_REQUIRED") return t("error_studio");
  if (code === "NO_WORKSPACE") return t("error_workspace");
  if (code === "RENDER_BUSY") return t("tool_server_processing_other_batches");
  if (code === "NO_IMAGES") return t("error_no_images");
  if (code === "UPLOAD_FAILED" || code === "UPLOAD_MISSING") return t("error_upload");
  if (code === "EXPORT_TOO_LARGE") return t("tool_zip_exceeds_storage_limit");
  if (code === "RENDER_PENDING") return t("tool_rendering_continues_on_server");
  if (code === "RENDER_ALREADY_PENDING") return t("tool_render_already_pending_account");
  if (code === "RENDER_INTERRUPTED") return t("tool_render_was_interrupted_trial");
  if (code === "RENDER_GEOMETRY_TOO_LARGE") return t("tool_screenshot_too_narrow_wide");
  if (code === "INPUT_TOO_LARGE" || code === "BATCH_TOO_LARGE") return t("tool_limit_exceeded_50_mb");
  if (code === "STORAGE_UNAVAILABLE") return t("error_storage");
  return t("error_export");
}
