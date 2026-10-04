export type CloneLabel = "ok" | "review" | "risk";

/**
 * Which signal drove the label, in plain terms:
 * - `same-set`: the same capture is used for both screens (forced risk);
 * - `layout-and-palette`: same structure and same colours;
 * - `layout`: same structure, clearly different colours;
 * - `palette`: near-uniform images whose colours are close (structure is meaningless on flat images);
 * - `distinct`: nothing similar enough to review.
 */
export type CloneReason = "same-set" | "layout-and-palette" | "layout" | "palette" | "distinct";

export type CloneResult = {
  index: number;
  /** Hamming distance between the two 64-bit difference hashes (0 = same structure). */
  distance: number;
  label: CloneLabel;
  reason?: CloneReason;
};

/** Structure hash plus the colour signals needed to tell two flat or recoloured screens apart. */
export type CloneFingerprint = {
  hash: bigint;
  /** Mean sRGB colour of the 9×8 thumbnail. */
  rgb: [number, number, number];
  /** Standard deviation of the greyscale thumbnail; near 0 means a uniform image. */
  contrast: number;
};

export const CLONE_RISK_MAX = 8;
export const CLONE_REVIEW_MAX = 18;
/** Below this greyscale deviation the difference hash only measures compression noise. */
export const CLONE_FLAT_CONTRAST = 6;
/** Euclidean distances between mean RGB colours. */
export const CLONE_PALETTE_CLOSE = 24;
export const CLONE_PALETTE_FAR = 60;

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

export function grayFromRgba(data: Uint8ClampedArray | Uint8Array, pixelCount: number, channels = 4): Uint8Array {
  const gray = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const o = i * channels;
    gray[i] = Math.round(((data[o] ?? 0) * 299 + (data[o + 1] ?? 0) * 587 + (data[o + 2] ?? 0) * 114) / 1000);
  }
  return gray;
}

/** Same fingerprint in the browser (canvas RGBA) and on the server (sharp RGB). */
export function fingerprintFromPixels(data: Uint8ClampedArray | Uint8Array, channels: number, width = 9, height = 8): CloneFingerprint {
  const count = width * height;
  const gray = grayFromRgba(data, count, channels);
  const sum = [0, 0, 0];
  for (let i = 0; i < count; i += 1) {
    for (let c = 0; c < 3; c += 1) sum[c]! += data[i * channels + c] ?? 0;
  }
  const mean = gray.reduce((total, value) => total + value, 0) / count;
  const variance = gray.reduce((total, value) => total + (value - mean) ** 2, 0) / count;
  return {
    hash: dHashFromGray(gray, width, height),
    rgb: [sum[0]! / count, sum[1]! / count, sum[2]! / count],
    contrast: Math.sqrt(variance),
  };
}

export function paletteDistance(a: CloneFingerprint, b: CloneFingerprint): number {
  return Math.hypot(a.rgb[0] - b.rgb[0], a.rgb[1] - b.rgb[1], a.rgb[2] - b.rgb[2]);
}

const SOFTER: Record<CloneLabel, CloneLabel> = { risk: "review", review: "ok", ok: "ok" };

/** Compares a closed/open pair. Bare hashes are still accepted and judged on structure alone. */
export function scorePair(
  outer: bigint | CloneFingerprint,
  inner: bigint | CloneFingerprint,
  index: number,
  forcedRisk = false,
): CloneResult {
  const a = typeof outer === "bigint" ? null : outer;
  const b = typeof inner === "bigint" ? null : inner;
  const distance = hammingDistance(typeof outer === "bigint" ? outer : outer.hash, typeof inner === "bigint" ? inner : inner.hash);
  if (forcedRisk) return { index, distance, label: "risk", reason: "same-set" };
  if (!a || !b) {
    const label = labelFromDistance(distance);
    return { index, distance, label, reason: label === "ok" ? "distinct" : "layout" };
  }
  const palette = paletteDistance(a, b);
  if (a.contrast < CLONE_FLAT_CONTRAST && b.contrast < CLONE_FLAT_CONTRAST) {
    // Two near-uniform images always share a structure hash; only their colours can be compared.
    const label: CloneLabel = palette <= CLONE_PALETTE_CLOSE ? "risk" : palette <= CLONE_PALETTE_FAR ? "review" : "ok";
    return { index, distance, label, reason: label === "ok" ? "distinct" : "palette" };
  }
  const structural = labelFromDistance(distance);
  if (structural === "ok") return { index, distance, label: "ok", reason: "distinct" };
  if (palette > CLONE_PALETTE_FAR) {
    // Same layout in clearly different colours: one level softer, still explained.
    const label = SOFTER[structural];
    return { index, distance, label, reason: label === "ok" ? "distinct" : "layout" };
  }
  return { index, distance, label: structural, reason: palette <= CLONE_PALETTE_CLOSE ? "layout-and-palette" : "layout" };
}

export function worstCloneLabel(results: CloneResult[]): CloneLabel {
  if (results.some((item) => item.label === "risk")) return "risk";
  if (results.some((item) => item.label === "review")) return "review";
  return "ok";
}
