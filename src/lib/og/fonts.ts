import { readFile } from "node:fs/promises";
import path from "node:path";

/** Geist and IBM Plex Mono as TTF: Satori cannot read the woff2 files next/font serves the site. */
const FILES = [
  { name: "Geist", file: "geist-500.ttf", weight: 500 },
  { name: "Geist", file: "geist-600.ttf", weight: 600 },
  { name: "Geist", file: "geist-700.ttf", weight: 700 },
  { name: "Plex Mono", file: "plex-mono-500.ttf", weight: 500 },
] as const;

type OgFont = { name: string; data: Buffer; weight: 500 | 600 | 700; style: "normal" };

let fonts: Promise<OgFont[]> | undefined;

export function ogFonts(): Promise<OgFont[]> {
  fonts ??= Promise.all(
    FILES.map(async ({ name, file, weight }) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(path.join(process.cwd(), "src/lib/og/fonts", file)),
    })),
  );
  return fonts;
}
