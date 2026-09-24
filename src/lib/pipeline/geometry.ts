import type { CropTransform, SlideFitMode } from "../specs";

export type Rect = { left: number; top: number; width: number; height: number };

export type CompositionMetrics = {
  fit: SlideFitMode;
  cropPercent: number;
  scale: number;
  overflowX: number;
  overflowY: number;
  severity: "ok" | "warning" | "severe";
  rect: Rect;
};

export function containRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Rect {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return {
    left: (dstW - width) / 2,
    top: (dstH - height) / 2,
    width,
    height,
  };
}

export function coverRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Rect {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return {
    left: (dstW - width) / 2,
    top: (dstH - height) / 2,
    width,
    height,
  };
}

/** Smart preserves the full image when filling would discard 10% or more. */
export function resolveSlideFit(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  transform: CropTransform,
): SlideFitMode {
  if (transform.fit !== "smart") return transform.fit;
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) return "cover";
  const zoom = Math.min(2, Math.max(1, transform.zoom ?? 1));
  const scale = Math.max(dstW / srcW, dstH / srcH) * zoom;
  const cropPercent = 100 * (1 - (dstW * dstH) / (srcW * srcH * scale * scale));
  return cropPercent < 10 ? "cover" : "contain";
}

export function compositionMetrics(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  transform: CropTransform,
): CompositionMetrics {
  const fit = resolveSlideFit(srcW, srcH, dstW, dstH, transform);
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return {
      fit,
      cropPercent: 0,
      scale: 1,
      overflowX: 0,
      overflowY: 0,
      severity: "ok",
      rect: { left: 0, top: 0, width: dstW, height: dstH },
    };
  }
  const baseScale = fit === "contain"
    ? Math.min(dstW / srcW, dstH / srcH)
    : Math.max(dstW / srcW, dstH / srcH);
  const scale = baseScale * (fit === "cover" ? Math.min(2, Math.max(1, transform.zoom ?? 1)) : 1);
  const width = srcW * scale;
  const height = srcH * scale;
  const overflowX = Math.max(0, width - dstW);
  const overflowY = Math.max(0, height - dstH);
  const cropPercent = fit === "contain"
    ? 0
    : Math.max(0, 100 * (1 - (dstW * dstH) / (width * height)));
  const severity = cropPercent > 25 || scale > 2
    ? "severe"
    : cropPercent >= 10 || scale > 1.5
      ? "warning"
      : "ok";
  return {
    fit,
    cropPercent,
    scale,
    overflowX,
    overflowY,
    severity,
    rect: {
      left: overflowX > 0 ? -overflowX * transform.x : 0,
      top: overflowY > 0 ? -overflowY * transform.y : 0,
      width,
      height,
    },
  };
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const raw = hex.trim().replace("#", "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 11, g: 13, b: 18 };
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "app";
}
