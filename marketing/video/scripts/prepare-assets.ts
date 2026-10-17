import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import sharp from "sharp";
import { sizes } from "../src/assets";

export const videoRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = path.resolve(videoRoot, "../..");
type HarborModule = {
  HARBOR_SLIDE_IDS: readonly string[];
  harborScreenSvg: (index: number, side: "outer" | "inner", locale: "en" | "fr", width: number, height: number) => string;
};

export async function prepareAssets(): Promise<void> {
  const work = await mkdtemp(path.join(tmpdir(), "duoshot-video-"));
  try {
    const bundle = path.join(work, "harbor.mjs");
    await build({ entryPoints: [path.join(repoRoot, "src/lib/pipeline/harbor-screens.ts")], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
    const { HARBOR_SLIDE_IDS, harborScreenSvg } = await import(pathToFileURL(bundle).href) as HarborModule;
    for (const locale of ["en", "fr"] as const) {
      const dir = path.join(videoRoot, "public/captures/harbor", locale);
      await mkdir(dir, { recursive: true });
      for (const index of HARBOR_SLIDE_IDS.keys()) {
        if (index > 2) break;
        const prefix = String(index + 1).padStart(2, "0");
        let outer: Buffer | undefined;
        for (const side of ["outer", "inner"] as const) {
          const { width, height } = sizes[side];
          const png = await sharp(Buffer.from(harborScreenSvg(index, side, locale, width, height))).removeAlpha().png().toBuffer();
          await sharp(png).toFile(path.join(dir, `${prefix}-${side}.png`));
          if (side === "outer") outer = png;
        }
        const { width, height } = sizes.classic;
        const screenHeight = Math.round(sizes.outer.height * width / sizes.outer.width);
        const letterbox = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="#0d2f3b" d="M0 0h${width}v${height / 2}H0z"/><path fill="#fbfcfc" d="M0 ${height / 2}h${width}v${height / 2}H0z"/></svg>`);
        if (!outer) throw new Error("Harbor outer capture missing.");
        const resized = await sharp(outer).resize(width, screenHeight).png().toBuffer();
        await sharp(letterbox).composite([{ input: resized, left: 0, top: Math.round((height - screenHeight) / 2) }]).png().toFile(path.join(dir, `${prefix}-classic.png`));
      }
    }
    const fontDir = path.join(videoRoot, "public/fonts");
    await mkdir(fontDir, { recursive: true });
    for (const font of ["geist-500.ttf", "geist-600.ttf", "geist-700.ttf", "plex-mono-500.ttf", "LICENSE-Geist.txt", "LICENSE-IBMPlexMono.txt"]) {
      await copyFile(path.join(repoRoot, "src/lib/og/fonts", font), path.join(fontDir, font));
    }
    await mkdir(path.join(videoRoot, "public/brand"), { recursive: true });
    await copyFile(path.join(repoRoot, "public/brand/duoshot-logo.png"), path.join(videoRoot, "public/brand/duoshot-logo.png"));
    console.log("Captures Harbor en/fr, polices et logo préparés.");
  } finally { await rm(work, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareAssets().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
