import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { convertMarkdown } from "../markdown";
import { parseConvertArgs } from "./args";

async function main(): Promise<void> {
  const args = parseConvertArgs(process.argv.slice(2));
  const scripts = convertMarkdown(await readFile(args.file, "utf8"));
  await mkdir(args.outDir, { recursive: true });
  for (const script of scripts) {
    const output = path.join(args.outDir, `${script.id}.json`);
    await writeFile(output, `${JSON.stringify(script, null, 2)}\n`);
    console.log(output);
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
