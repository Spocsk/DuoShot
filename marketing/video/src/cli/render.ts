import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { prepareAssets, videoRoot } from "../../scripts/prepare-assets";
import { capturePath, sceneCaptures } from "../assets";
import { resolveEndUrl, validateScript, type VideoScript } from "../schema";
import { parseRenderArgs } from "./args";
import { validateOutputs } from "./outputs";

async function exists(file: string): Promise<boolean> {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

export async function main(argv = process.argv.slice(2), env: Record<string, string | undefined> = process.env): Promise<void> {
  const args = parseRenderArgs(argv, env);
  const scripts: VideoScript[] = [];
  const errors: string[] = [];
  // No bundling, preparation or rendering until every input has passed validation.
  for (const file of args.files) {
    try {
      const script = validateScript(JSON.parse(await readFile(file, "utf8")));
      scripts.push(script);
    } catch (error) { errors.push(`${file}\n${error instanceof Error ? error.message : String(error)}`); }
  }
  if (errors.length) throw new Error(`Validation échouée ; aucune vidéo rendue.\n${errors.join("\n\n")}`);
  validateOutputs(scripts, args.platforms, args.outDir);

  const publicDir = path.join(videoRoot, "public");
  const refs = [...new Set(scripts.flatMap((script) => script.scenes.flatMap(sceneCaptures)))];
  const harborFiles = ["en", "fr"].flatMap((locale) => [1, 2, 3].flatMap((slide) =>
    ["outer", "inner", "classic"].map((side) => `captures/harbor/${locale}/${String(slide).padStart(2, "0")}-${side}.png`)));
  const required = [...harborFiles, "fonts/geist-500.ttf", "fonts/geist-600.ttf", "fonts/geist-700.ttf", "fonts/plex-mono-500.ttf", "brand/duoshot-logo.png"];
  if ((await Promise.all(required.map((file) => exists(path.join(publicDir, file))))).some((found) => !found)) {
    console.log("Préparation automatique des ressources…");
    try { await prepareAssets(); }
    catch (error) {
      console.warn(`Préparation incomplète : ${error instanceof Error ? error.message : String(error)}`);
      // Fonts are essential for predictable text fitting; captures have a visual fallback.
      for (const font of required.filter((file) => file.startsWith("fonts/"))) {
        if (!await exists(path.join(publicDir, font))) throw new Error(`Police manquante : ${font}. Relancez npm run prepare-assets.`);
      }
    }
  }
  for (const ref of refs) {
    if (!await exists(path.join(publicDir, capturePath(ref)))) console.warn(`AVERTISSEMENT — capture manquante : ${ref} (placeholder visible dans la vidéo).`);
  }
  await mkdir(args.outDir, { recursive: true });
  console.log("Bundle Remotion…");
  const serveUrl = await bundle({ entryPoint: fileURLToPath(new URL("../index.tsx", import.meta.url)), publicDir });
  for (const script of scripts) {
    const start = performance.now();
    const composition = await selectComposition({ serveUrl, id: "SocialVideo", inputProps: script });
    const outputLocation = path.resolve(args.outDir, `${script.id}.mp4`);
    console.log(`${script.id} — ${composition.durationInFrames} images, rendu H.264…`);
    let lastProgress = -1;
    await renderMedia({
      serveUrl, composition, inputProps: script, outputLocation,
      codec: "h264", pixelFormat: "yuv420p", audioCodec: "aac", enforceAudioTrack: true,
      crf: 18, concurrency: args.concurrency,
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 100 / 10) * 10;
        if (percent > lastProgress) { lastProgress = percent; console.log(`${script.id} : ${percent} %`); }
      },
    });
    for (const platform of args.platforms) {
      const name = path.resolve(args.outDir, `${script.id}-${platform}`);
      await copyFile(outputLocation, `${name}.mp4`);
      await writeFile(`${name}.txt`, `${resolveEndUrl(script.endUrl, platform)}\n`);
    }
    console.log(`${script.id} terminé en ${((performance.now() - start) / 1000).toFixed(1)} s → ${outputLocation}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
