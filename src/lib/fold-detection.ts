import { hingeBand, type Orientation } from "./specs";
import type { Rect } from "./pipeline/geometry";

export type FoldCheckStatus = "checking" | "clear" | "warning" | "error";

/** Keep enough neighbouring content for OCR while giving the fold extra safety room. */
export function foldScanRegion(width: number, height: number, orientation: Orientation): Rect {
  return orientation === "portrait"
    ? { left: width * 0.25, top: 0, width: width * 0.5, height }
    : { left: 0, top: height * 0.25, width, height: height * 0.5 };
}

export function foldSafetyBand(width: number, height: number, orientation: Orientation): Rect {
  const band = hingeBand({ width, height, orientation });
  const margin = (orientation === "portrait" ? width : height) * 0.02;
  return orientation === "portrait"
    ? { left: band.x - margin, top: 0, width: band.width + margin * 2, height }
    : { left: 0, top: band.y - margin, width, height: band.height + margin * 2 };
}

/** Tesseract TSV contains one row per recognized word at level 5. */
export function wordsOnFold(tsv: string | null, width: number, height: number, orientation: Orientation, scanBand = foldSafetyBand(width, height, orientation)): number {
  if (!tsv) return 0;
  let count = 0;
  for (const row of tsv.split(/\r?\n/).slice(1)) {
    const cells = row.split("\t");
    if (cells.length < 12 || cells[0] !== "5") continue;
    const confidence = Number(cells[10]);
    const label = cells.slice(11).join("\t").trim();
    if (confidence < 20 || label.length < 2) continue;
    const left = Number(cells[6]);
    const top = Number(cells[7]);
    const wordWidth = Number(cells[8]);
    const wordHeight = Number(cells[9]);
    if (![left, top, wordWidth, wordHeight].every(Number.isFinite)) continue;
    const overlapX = Math.max(0, Math.min(left + wordWidth, scanBand.left + scanBand.width) - Math.max(left, scanBand.left));
    const overlapY = Math.max(0, Math.min(top + wordHeight, scanBand.top + scanBand.height) - Math.max(top, scanBand.top));
    if (overlapX > 0 && overlapY > 0) count++;
  }
  return count;
}
