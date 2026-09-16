import { MAX_IMAGES } from "./specs";

export function mergeSideFiles(current: File[], incoming: File[]): File[] {
  if (incoming.length >= MAX_IMAGES) return incoming.slice(0, MAX_IMAGES);
  const next = [...current];
  for (const file of incoming) {
    if (next.length >= MAX_IMAGES) break;
    next.push(file);
  }
  return next;
}
