import type { Worker } from "tesseract.js";
import { compositionMetrics } from "./pipeline/geometry";
import { foldSafetyBand, foldScanRegion, wordsOnFold } from "./fold-detection";
import type { CropTransform, SizeSpec } from "./specs";

const OCR_LONG_SIDE = 2400;

export async function checkFoldImage(
  file: File,
  spec: SizeSpec,
  transform: CropTransform,
  worker: Worker,
  backgroundColor: string,
): Promise<number> {
  const bitmap = await createImageBitmap(file);
  try {
    const region = foldScanRegion(spec.width, spec.height, spec.orientation);
    const ratio = Math.min(1, OCR_LONG_SIDE / Math.max(region.width, region.height));
    const width = Math.max(1, Math.round(region.width * ratio));
    const height = Math.max(1, Math.round(region.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("OCR_CANVAS_UNAVAILABLE");
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    const rect = compositionMetrics(bitmap.width, bitmap.height, spec.width, spec.height, transform).rect;
    context.drawImage(bitmap, (rect.left - region.left) * ratio, (rect.top - region.top) * ratio, rect.width * ratio, rect.height * ratio);
    const result = await worker.recognize(canvas, undefined, { text: false, tsv: true });
    const band = foldSafetyBand(spec.width, spec.height, spec.orientation);
    return wordsOnFold(result.data.tsv, width, height, spec.orientation, {
      left: (band.left - region.left) * ratio,
      top: (band.top - region.top) * ratio,
      width: band.width * ratio,
      height: band.height * ratio,
    });
  } finally {
    bitmap.close();
  }
}
