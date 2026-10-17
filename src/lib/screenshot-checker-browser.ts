import { hasTransparentPixels, matchScreenshotSize, pngHasAlphaChannel } from "./screenshot-checker";

/** Local blob URLs only; no network request or storage is used. */
export async function inspectScreenshot(file: File) {
  const url = URL.createObjectURL(file);
  const canvas = document.createElement("canvas");
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("CANVAS_UNAVAILABLE");
    context.drawImage(image, 0, 0);
    // Read strips at original resolution: even a single transparent pixel matters.
    let transparent = false;
    for (let y = 0; y < height && !transparent; y += 128) {
      transparent = hasTransparentPixels(context.getImageData(0, y, width, Math.min(128, height - y)).data);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    return {
      width, height, match: matchScreenshotSize(width, height),
      transparent, alphaChannel: pngHasAlphaChannel(bytes), supportedFormat: png || jpeg,
    };
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}
