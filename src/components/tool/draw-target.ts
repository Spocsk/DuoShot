import { normalizeCropTransform, overlayTextColor, textOverlayLayout, type CropTransform, type RenderOptions, type SizeSpec } from "@/lib/specs";
import { compositionMetrics, coverRect } from "@/lib/pipeline/geometry";

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
  if (options.title || options.subtitle) {
    ctx.fillStyle = overlayTextColor(options);
    ctx.textAlign = "center";
    const family = options.titleFont === "serif" ? "Georgia, serif" : "system-ui";
    if (options.title) {
      ctx.font = `700 ${layout.titleSize}px ${family}`;
      ctx.fillText(options.title, layout.x, layout.yTitle, layout.maxWidth);
    }
    if (options.subtitle) {
      ctx.globalAlpha = 0.82;
      ctx.font = `700 ${layout.subtitleSize}px ${family}`;
      ctx.fillText(options.subtitle, layout.x, layout.ySubtitle, layout.maxWidth);
      ctx.globalAlpha = 1;
    }
  }
  return canvas.toDataURL("image/jpeg", 0.7);
}
