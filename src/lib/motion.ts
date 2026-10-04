export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Wide screens without reduced motion get the landing's scroll narrative. */
export const LANDING_MOTION_QUERY = "(min-width: 900px) and (prefers-reduced-motion: no-preference)";
