import type { Translator } from "@/lib/i18n/types";

export function explainError({ locale, t }: Translator, code: string) {
  if (code === "AUTH_REQUIRED") return t("error_auth");
  if (code === "TRIAL_EXHAUSTED") return t("error_trial");
  if (code === "DAILY_LIMIT") return t("error_daily");
  if (code === "IPHONE_69_GATED") return t("error_69");
  if (code === "CLONE_RISK") return t("error_clone");
  if (code === "STUDIO_REQUIRED") return t("error_studio");
  if (code === "NO_WORKSPACE") return t("error_workspace");
  if (code === "RENDER_BUSY") return locale === "fr" ? "Le serveur traite déjà plusieurs lots. Réessayez dans quelques secondes ; aucun quota n’a été consommé." : "The server is processing other batches. Retry shortly; no quota was consumed.";
  if (code === "NO_IMAGES") return t("error_no_images");
  if (code === "UPLOAD_FAILED" || code === "UPLOAD_MISSING") return t("error_upload");
  if (code === "EXPORT_TOO_LARGE") return locale === "fr" ? "Le ZIP dépasse la limite de stockage. Réduisez le nombre de paires ou choisissez JPEG." : "The ZIP exceeds the storage limit. Use fewer pairs or choose JPEG.";
  if (code === "RENDER_PENDING") return locale === "fr" ? "Le rendu continue sur le serveur. Revenez sur cette page pour récupérer le résultat." : "Rendering continues on the server. Return to this page to retrieve it.";
  if (code === "RENDER_ALREADY_PENDING") return locale === "fr" ? "Un rendu est déjà en cours sur ce compte. Rechargez la page pour le retrouver." : "A render is already pending for this account. Reload to recover it.";
  if (code === "RENDER_INTERRUPTED") return locale === "fr" ? "Ce rendu a été interrompu. Votre essai a été restitué ; vous pouvez réessayer." : "This render was interrupted. Your trial was restored; you can retry.";
  if (code === "RENDER_GEOMETRY_TOO_LARGE") return locale === "fr" ? "Cette capture est trop allongée pour ce recadrage. Choisissez le mode Tout afficher ou réduisez le zoom." : "This screenshot is too narrow or wide for this crop. Choose Contain or reduce the zoom.";
  if (code === "INPUT_TOO_LARGE" || code === "BATCH_TOO_LARGE") return locale === "fr" ? "Limite dépassée : 50 Mo et 40 mégapixels par capture, 200 Mo par lot." : "Limit exceeded: 50 MB and 40 megapixels per screenshot, 200 MB per batch.";
  if (code === "STORAGE_UNAVAILABLE") return t("error_storage");
  return t("error_export");
}
