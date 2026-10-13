#!/usr/bin/env node
/**
 * Renders the Harbor demo screens (src/lib/pipeline/harbor-screens.ts) into public/harbor/ as WebP, for the landing
 * and the review preview. The tool, the review demo and the example ZIP keep rendering full size on the server; these
 * files are smaller copies of the same drawing. Re-run after changing harbor-screens.ts:
 *
 *   node scripts/render-harbor-assets.mjs
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const work = mkdtempSync(path.join(tmpdir(), "harbor-"));
const bundle = path.join(work, "harbor-screens.mjs");
await build({ entryPoints: [path.join(root, "src/lib/pipeline/harbor-screens.ts")], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
const { HARBOR_SLIDE_IDS, harborScreenSvg } = await import(pathToFileURL(bundle).href);

/** Export pixels per side, and the width shipped to the page (enough for a 2x screen at the largest landing size). */
const SIDES = { outer: { width: 1398, height: 2034, out: 600 }, inner: { width: 2007, height: 2853, out: 860 } };

for (const locale of ["en", "fr"]) {
  const dir = path.join(root, "public/harbor", locale);
  mkdirSync(dir, { recursive: true });
  for (const index of HARBOR_SLIDE_IDS.keys()) {
    for (const [side, size] of Object.entries(SIDES)) {
      const svg = harborScreenSvg(index, side, locale, size.width, size.height);
      const file = path.join(dir, `${String(index + 1).padStart(2, "0")}-${side}.webp`);
      await sharp(Buffer.from(svg)).resize(size.out).removeAlpha().webp({ quality: 86, smartSubsample: true }).toFile(file);
      console.log(path.relative(root, file));
    }
  }
}
rmSync(work, { recursive: true, force: true });
