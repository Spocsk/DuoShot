import { dHashFromGray, grayFromRgba } from "./clone-score";

export async function hashFromFile(file: File): Promise<bigint> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return BigInt(0);
  }
  ctx.drawImage(bitmap, 0, 0, 9, 8);
  const image = ctx.getImageData(0, 0, 9, 8);
  bitmap.close();
  return dHashFromGray(grayFromRgba(image.data, 72), 9, 8);
}
