import path from "node:path";
import type { Platform } from "../schema";

/** Validate the complete output namespace before any preparation or rendering. */
export function validateOutputs(scripts: { id: string }[], platforms: Platform[], outDir: string): void {
  const ids = new Set<string>();
  const outputs = new Map<string, string>();
  for (const { id } of scripts) {
    if (ids.has(id)) throw new Error(`Identifiant dupliqué : ${id} ; aucune vidéo rendue.`);
    ids.add(id);
    const names = [`${id}.mp4`, ...platforms.flatMap((platform) => [`${id}-${platform}.mp4`, `${id}-${platform}.txt`])];
    for (const name of names) {
      const output = path.resolve(outDir, name);
      const previous = outputs.get(output);
      if (previous !== undefined) throw new Error(`Collision de sortie : ${output} (scripts ${previous} et ${id}) ; aucune vidéo rendue.`);
      outputs.set(output, id);
    }
  }
}
