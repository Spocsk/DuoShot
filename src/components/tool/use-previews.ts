import { useCallback, useEffect, useState } from "react";
import { duoSpec, type CropTransform, type RenderOptions } from "@/lib/specs";
import { drawTarget } from "@/components/tool/draw-target";

/** Client-side JPEG previews of the selected pair, redrawn whenever its inputs change. */
export function usePreviews(
  outerSlide: File | undefined,
  innerSlide: File | undefined,
  renderOptions: RenderOptions,
  outerTransform: CropTransform,
  innerTransform: CropTransform,
) {
  const [previews, setPreviews] = useState<{ outer: string; inner: string } | null>(null);

  const drawPreviews = useCallback(
    async (
      outer: File | undefined,
      inner: File | undefined,
      next: RenderOptions,
      transforms: { outer: CropTransform; inner: CropTransform },
    ) => {
      if (!outer && !inner) {
        setPreviews(null);
        return;
      }
      const outerSpec = duoSpec("duo-outer", next.orientation);
      const innerSpec = duoSpec("duo-inner", next.orientation);
      const nextPreviews = { outer: "", inner: "" };
      if (outer) {
        const bitmap = await createImageBitmap(outer);
        nextPreviews.outer = drawTarget(bitmap, next, outerSpec, transforms.outer);
        bitmap.close();
      }
      if (inner) {
        const bitmap = await createImageBitmap(inner);
        nextPreviews.inner = drawTarget(bitmap, next, innerSpec, transforms.inner);
        bitmap.close();
      }
      setPreviews(nextPreviews);
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!outerSlide && !innerSlide) {
        setPreviews(null);
        return;
      }
      void drawPreviews(outerSlide, innerSlide, renderOptions, {
        outer: outerTransform,
        inner: innerTransform,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drawPreviews, innerSlide, innerTransform, outerSlide, outerTransform, renderOptions]);

  return previews;
}
