export type ColorSpaceGuess = "srgb" | "other" | "unknown";

export type SourceInspect = {
  width: number;
  height: number;
  hasAlpha: boolean;
  colorSpace: ColorSpaceGuess;
  format: "png" | "jpeg" | "unknown";
};

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function readU32(view: DataView, offset: number) {
  return view.getUint32(offset);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function inspectPng(bytes: Uint8Array): SourceInspect {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width = 0;
  let height = 0;
  let hasAlpha = false;
  let colorSpace: ColorSpaceGuess = "unknown";
  while (offset + 8 <= bytes.length) {
    const length = readU32(view, offset);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    if (type === "IHDR" && length >= 13) {
      width = readU32(view, dataStart);
      height = readU32(view, dataStart + 4);
      const colorType = bytes[dataStart + 9] ?? 0;
      hasAlpha = colorType === 4 || colorType === 6;
    } else if (type === "tRNS") {
      hasAlpha = true;
    } else if (type === "sRGB") {
      colorSpace = "srgb";
    } else if (type === "iCCP") {
      colorSpace = "other";
    }
    if (type === "IEND") break;
    offset = dataEnd + 4;
  }
  if (colorSpace === "unknown") colorSpace = "srgb";
  return { width, height, hasAlpha, colorSpace, format: "png" };
}

function inspectJpeg(bytes: Uint8Array): SourceInspect {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  let width = 0;
  let height = 0;
  let colorSpace: ColorSpaceGuess = "srgb";
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xd9 || marker === 0xda) break;
    const size = view.getUint16(offset + 2);
    if (size < 2 || offset + 2 + size > bytes.length) break;
    if (marker === 0xe2) {
      const ident = ascii(bytes, offset + 4, 11);
      if (ident.startsWith("ICC_PROFILE")) colorSpace = "other";
    }
    if (marker >= 0xc0 && marker <= 0xc3) {
      height = view.getUint16(offset + 5);
      width = view.getUint16(offset + 7);
    }
    offset += 2 + size;
  }
  return { width, height, hasAlpha: false, colorSpace, format: "jpeg" };
}

export function inspectSource(buffer: ArrayBuffer | Uint8Array): SourceInspect {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const png = PNG_SIG.every((value, index) => bytes[index] === value);
  if (png) return inspectPng(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return inspectJpeg(bytes);
  return { width: 0, height: 0, hasAlpha: false, colorSpace: "unknown", format: "unknown" };
}

export async function inspectFile(file: File): Promise<SourceInspect> {
  const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
  return inspectSource(buffer);
}
