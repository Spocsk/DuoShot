import { normalizeCropTransform, overlayTextColor, textOverlayLayout, type CropTransform, type RenderOptions, type SizeSpec } from "@/lib/specs";
import { compositionMetrics, coverRect } from "@/lib/pipeline/geometry";

/** Same families as the server renderer (src/lib/pipeline/process.ts), served from public/fonts via studio.css. */
export function overlayFontFamily(font: RenderOptions["titleFont"]): string {
  return font === "serif" ? '"DuoShot serif", "DejaVu Serif", serif' : '"DuoShot sans", "DejaVu Sans", sans-serif';
}

/** Canvas text does not wait for @font-face: load the face before the first draw. */
export async function loadOverlayFont(font: RenderOptions["titleFont"]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try { await document.fonts.load(`700 48px ${overlayFontFamily(font)}`); } catch { /* fallback font */ }
}

export function drawTarget(
  bitmap: ImageBitmap,
  options: RenderOptions,
  spec: Pick<SizeSpec, "slot" | "orientation" | "width" | "height">,
  cropTransform?: CropTransform,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (options.background === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, spec.height);
    gradient.addColorStop(0, options.gradientFrom);
    gradient.addColorStop(1, options.gradientTo);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = options.solidColor;
  }
  ctx.fillRect(0, 0, spec.width, spec.height);
  if (options.background === "blur") {
    ctx.filter = "blur(28px)";
    const cover = coverRect(bitmap.width, bitmap.height, spec.width, spec.height);
    ctx.drawImage(bitmap, cover.left, cover.top, cover.width, cover.height);
    ctx.filter = "none";
  }
  const transform = normalizeCropTransform(cropTransform, options.fit);
  const rect = compositionMetrics(
    bitmap.width,
    bitmap.height,
    spec.width,
    spec.height,
    transform,
  ).rect;
  ctx.drawImage(bitmap, rect.left, rect.top, rect.width, rect.height);
  const layout = textOverlayLayout(spec, options.titlePosition);
  const title = options.title?.trim();
  const subtitle = options.subtitle?.trim();
  if (title || subtitle) {
    ctx.fillStyle = overlayTextColor(options);
    ctx.textAlign = "center";
    const family = overlayFontFamily(options.titleFont);
    // Mirrors process.ts: same font files, and long lines are fitted to maxWidth like SVG textLength.
    const draw = (text: string, size: number, y: number) => {
      ctx.font = `700 ${size}px ${family}`;
      if (Array.from(text).length * size * 0.68 > layout.maxWidth) {
        const measured = Math.max(ctx.measureText(text).width, 1);
        ctx.save();
        ctx.translate(layout.x, y);
        ctx.scale(layout.maxWidth / measured, 1);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(text, layout.x, y);
      }
    };
    if (title) draw(title, layout.titleSize, layout.yTitle);
    if (subtitle) {
      ctx.globalAlpha = 0.82;
      draw(subtitle, layout.subtitleSize, layout.ySubtitle);
      ctx.globalAlpha = 1;
    }
  }
  return canvas.toDataURL("image/jpeg", 0.7);
}
