import type { Locale } from "@/lib/specs";

/**
 * Harbor, the fictional surf app of every DuoShot example. The landing shows the same screens the tool, the review
 * demo and the example ZIP render (src/lib/pipeline/harbor-screens.ts), pre-rendered into public/harbor/ by
 * scripts/render-harbor-assets.mjs.
 */
export const HARBOR_SHOT_SIZE = {
  outer: { width: 600, height: 873 },
  inner: { width: 860, height: 1223 },
} as const;

export type HarborShotSide = keyof typeof HARBOR_SHOT_SIZE;

export function harborShotSrc(locale: Locale, index: number, side: HarborShotSide): string {
  return `/harbor/${locale}/${String(index + 1).padStart(2, "0")}-${side}.webp`;
}

/** Decorative: every use sits next to its own caption, so the image itself carries no alt text. */
export function HarborShot({ locale, index = 0, side, eager = false, className }: {
  locale: Locale;
  index?: number;
  side: HarborShotSide;
  eager?: boolean;
  className?: string;
}) {
  const size = HARBOR_SHOT_SIZE[side];
  return (
    // Pre-sized static WebP: the image optimizer would only re-encode it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className ? `harbor-shot ${className}` : "harbor-shot"}
      src={harborShotSrc(locale, index, side)}
      width={size.width}
      height={size.height}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}
