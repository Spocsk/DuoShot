export type CloneLabel = "ok" | "review" | "risk";

export type CloneResult = {
  index: number;
  distance: number;
  label: CloneLabel;
};

export const CLONE_RISK_MAX = 8;
export const CLONE_REVIEW_MAX = 18;

export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x !== BigInt(0)) {
    x &= x - BigInt(1);
    count += 1;
  }
  return count;
}

export function labelFromDistance(distance: number, forcedRisk = false): CloneLabel {
  if (forcedRisk) return "risk";
  if (distance <= CLONE_RISK_MAX) return "risk";
  if (distance <= CLONE_REVIEW_MAX) return "review";
  return "ok";
}

/** 9×8 greyscale, 64-bit difference hash. */
export function dHashFromGray(pixels: Uint8Array | Uint8ClampedArray, width = 9, height = 8): bigint {
  let hash = BigInt(0);
  let bit = BigInt(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const left = pixels[y * width + x] ?? 0;
      const right = pixels[y * width + x + 1] ?? 0;
      if (left > right) hash |= BigInt(1) << bit;
      bit += BigInt(1);
    }
  }
  return hash;
}

export function grayFromRgba(data: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const gray = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const o = i * 4;
    gray[i] = Math.round(((data[o] ?? 0) * 299 + (data[o + 1] ?? 0) * 587 + (data[o + 2] ?? 0) * 114) / 1000);
  }
  return gray;
}

export function scorePair(outerHash: bigint, innerHash: bigint, index: number, forcedRisk = false): CloneResult {
  const distance = hammingDistance(outerHash, innerHash);
  return { index, distance, label: labelFromDistance(distance, forcedRisk) };
}

export function worstCloneLabel(results: CloneResult[]): CloneLabel {
  if (results.some((item) => item.label === "risk")) return "risk";
  if (results.some((item) => item.label === "review")) return "review";
  return "ok";
}
