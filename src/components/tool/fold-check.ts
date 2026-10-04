import type { Locale } from "@/lib/specs";
import type { FoldCheckStatus } from "@/lib/fold-detection";

export type FoldCheck = { key: string; status: FoldCheckStatus; count: number };

export function foldStatusText(locale: Locale, check?: FoldCheck): string {
  if (!check || check.status === "checking") return locale === "fr" ? "Analyse en cours…" : "Checking…";
  if (check.status === "error") return locale === "fr" ? "Analyse indisponible : vérifiez visuellement le pli." : "Check unavailable: inspect the fold visually.";
  if (check.status === "warning") return locale === "fr" ? "Texte possiblement sous le pli : vérifiez la lisibilité." : "Possible text beneath the fold: check legibility.";
  return locale === "fr" ? "Aucun chevauchement détecté ; vérifiez le rendu final." : "No overlap detected; review the final image.";
}
