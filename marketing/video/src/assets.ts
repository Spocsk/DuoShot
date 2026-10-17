import type { Scene } from "./schema";

export const sizes = {
  outer: { width: 1398, height: 2034 },
  inner: { width: 2007, height: 2853 },
  classic: { width: 1206, height: 2622 },
} as const;
export type CaptureKind = keyof typeof sizes;

export function capturePath(ref: string): string {
  const match = /^harbor:(en|fr):([1-3]):(outer|inner|classic)$/.exec(ref);
  return match ? `captures/harbor/${match[1]}/${match[2].padStart(2, "0")}-${match[3]}.png` : ref;
}

export function captureKind(ref: string, fallback: CaptureKind = "outer"): CaptureKind {
  const kind = ref.split(":").at(-1);
  return kind === "inner" || kind === "classic" || kind === "outer" ? kind : fallback;
}

export function sceneCaptures(scene: Scene): string[] {
  switch (scene.type) {
    case "outer": case "inner": case "classic": return [scene.capture];
    case "outer-to-inner": case "side-by-side": return [scene.outer, scene.inner];
    case "before-after": return [scene.before, scene.after];
    case "reframe": return [scene.classic, scene.outer, scene.inner];
    default: return [];
  }
}
