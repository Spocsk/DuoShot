import { platforms, PlatformSchema, type Platform } from "../schema";

export interface RenderArgs {
  files: string[];
  platforms: Platform[];
  outDir: string;
  concurrency?: number;
}

export function parseRenderArgs(argv: string[], env: Record<string, string | undefined> = {}): RenderArgs {
  const result: RenderArgs = { files: [], platforms: [...platforms], outDir: env.VIDEO_OUT_DIR || "/workspace/videos/" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      if (!arg.endsWith(".json")) throw new Error(`Script JSON attendu : ${arg}`);
      result.files.push(arg);
      continue;
    }
    if (!["--platform", "--out", "--concurrency"].includes(arg)) throw new Error(`Option inconnue : ${arg}`);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`Valeur manquante pour ${arg}`);
    if (arg === "--out") result.outDir = value;
    if (arg === "--platform") {
      result.platforms = [...new Set(value.split(",").map((item) => {
        const parsed = PlatformSchema.safeParse(item.trim());
        if (!parsed.success) throw new Error(`Plateforme inconnue : ${item}. Valeurs : ${platforms.join(", ")}.`);
        return parsed.data;
      }))];
    }
    if (arg === "--concurrency") {
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("--concurrency attend un entier positif.");
      result.concurrency = Number(value);
    }
  }
  if (result.files.length === 0) throw new Error("Usage : npm run render -- scripts/*.json [--platform tiktok,instagram,youtube] [--out dir] [--concurrency N]");
  return result;
}

export function parseConvertArgs(argv: string[]): { file: string; outDir: string } {
  let file: string | undefined;
  let outDir = "scripts";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("Valeur manquante pour --out.");
      outDir = value;
    } else if (argv[i].startsWith("--") || file) throw new Error(`Argument inattendu : ${argv[i]}`);
    else file = argv[i];
  }
  if (!file) throw new Error("Usage : npm run convert -- fichier.md [--out dir]");
  return { file, outDir };
}
