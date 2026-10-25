import { sizes, type CaptureKind } from "./assets";

export const layout = {
  width: 1080, height: 1920,
  safe: { top: 250, bottom: 380, side: 60 },
  headingHeight: 220, headingGap: 20,
  dimensionHeight: 60, dimensionGap: 16, pairGap: 40,
} as const;

export const contentWidth = layout.width - 2 * layout.safe.side;
export const stageTop = layout.safe.top + layout.headingHeight + layout.headingGap;
export const dimensionTop = layout.height - layout.safe.bottom - layout.dimensionHeight;
export const stageHeight = dimensionTop - layout.dimensionGap - stageTop;
// One video pixel / capture pixel ratio, including during transitions (~0.3414).
export const captureScale = Math.min(contentWidth / sizes.inner.width, stageHeight / sizes.inner.height);

export function pairScale(kinds: CaptureKind[], height = stageHeight, equalColumns = false): number {
  const availableWidth = contentWidth - layout.pairGap;
  const totalWidth = kinds.reduce((sum, kind) => sum + sizes[kind].width, 0);
  return Math.min(availableWidth / totalWidth, ...kinds.map((kind) => height / sizes[kind].height),
    ...(equalColumns ? kinds.map((kind) => availableWidth / 2 / sizes[kind].width) : []));
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

function outerToInnerEnd(fps: number, duration: number) {
  // Complete within 0.8 s, also leaving a readable hold in a 0.5 s scene.
  return Math.min(Math.round(0.8 * fps), Math.max(1, Math.floor((duration - 1) * 0.75)));
}

export function outerToInner(frame: number, fps: number, duration: number) {
  return smooth(frame / outerToInnerEnd(fps, duration));
}

// Center a short label fade on the animation midpoint, entirely inside its bounds.
export function dimensionLabelProgress(frame: number, start: number, end: number) {
  const fadeFrames = Math.min(6, end - start);
  return smooth((frame - (start + end - fadeFrames) / 2) / fadeFrames);
}

export function outerToInnerDimensions(frame: number, fps: number, duration: number) {
  const inner = dimensionLabelProgress(frame, 0, outerToInnerEnd(fps, duration));
  return { outer: 1 - inner, inner };
}

const reframeTiming = { cropStart: 0.12, cropDuration: 0.28, outerStart: 0.40, outerDuration: 0.08, innerStart: 0.62, innerDuration: 0.20 };

export function reframeDimensions(frame: number, duration: number) {
  const lastFrame = Math.max(1, duration - 1);
  const outer = dimensionLabelProgress(frame, reframeTiming.cropStart * lastFrame, (reframeTiming.cropStart + reframeTiming.cropDuration) * lastFrame);
  const inner = dimensionLabelProgress(frame, reframeTiming.innerStart * lastFrame, (reframeTiming.innerStart + reframeTiming.innerDuration) * lastFrame);
  return { classic: 1 - outer, outer: outer * (1 - inner), inner };
}

export function reframeState(frame: number, duration: number) {
  const progress = frame / Math.max(1, duration - 1);
  const crop = smooth((progress - reframeTiming.cropStart) / reframeTiming.cropDuration);
  const outer = smooth((progress - reframeTiming.outerStart) / reframeTiming.outerDuration);
  const inner = smooth((progress - reframeTiming.innerStart) / reframeTiming.innerDuration);
  return { crop, classic: 1 - outer, outer: outer * (1 - inner), inner };
}

export function sceneOpacity(frame: number, duration: number, openingTitle: boolean) {
  const entrance = openingTitle ? 1 : clamp(frame / Math.min(10, duration / 3));
  const exitStart = Math.max(duration - 9, duration * 2 / 3);
  return Math.min(entrance, clamp((duration - frame) / (duration - exitStart)));
}

export function zipPages(count: number, duration: number) {
  const pages = Math.ceil(count / 4);
  return Array.from({ length: pages }, (_, index) => {
    const from = Math.floor(index * duration / pages);
    return { from, durationInFrames: Math.floor((index + 1) * duration / pages) - from, start: index * 4, end: (index + 1) * 4 };
  });
}
