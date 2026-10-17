import type { VideoScript } from "./schema";

export const FPS = 30;

export function sceneTiming(script: VideoScript): { from: number; durationInFrames: number }[] {
  let seconds = 0;
  let previousEnd = 0;
  const totalFrames = Math.round(script.durationSec * FPS);
  return script.scenes.map((scene, index) => {
    const from = previousEnd;
    seconds += scene.durationSec;
    // Round cumulative boundaries, reserving one frame for every remaining scene.
    const remaining = script.scenes.length - index - 1;
    const end = remaining === 0 ? totalFrames : Math.max(from + 1, Math.min(totalFrames - remaining, Math.round(seconds * FPS)));
    previousEnd = end;
    return { from, durationInFrames: end - from };
  });
}
