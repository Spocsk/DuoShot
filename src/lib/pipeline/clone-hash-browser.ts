import { fingerprintFromPixels, type CloneFingerprint } from "./clone-score";

export async function hashFromFile(file: File): Promise<CloneFingerprint> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { hash: BigInt(0), rgb: [0, 0, 0], contrast: 0 };
  }
  ctx.drawImage(bitmap, 0, 0, 9, 8);
  const image = ctx.getImageData(0, 0, 9, 8);
  bitmap.close();
  return fingerprintFromPixels(image.data, 4, 9, 8);
}
