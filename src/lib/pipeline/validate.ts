import { MAX_IMAGES, WARN_MIN_IMAGES, type Orientation } from "../specs";

export type SourceCheck = {
  count: number;
  warning?: "TOO_FEW";
};

export function checkSourceCount(count: number): SourceCheck {
  if (count < 1) {
    throw new Error("NO_IMAGES");
  }
  if (count > MAX_IMAGES) {
    throw new Error("TOO_MANY_IMAGES");
  }
  if (count < WARN_MIN_IMAGES) {
    return { count, warning: "TOO_FEW" };
  }
  return { count };
}

export function assertSingleOrientation(orientation: Orientation): Orientation {
  if (orientation !== "portrait" && orientation !== "landscape") {
    throw new Error("ORIENTATION_INVALID");
  }
  return orientation;
}
