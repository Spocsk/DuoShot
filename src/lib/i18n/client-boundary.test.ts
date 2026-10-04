import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Client bundles must only carry the current locale's messages, which arrive through
 * I18nProvider. This walks the static import graph from every "use client" module and
 * fails if it reaches a module that loads the dictionaries.
 */

const SRC = path.resolve(__dirname, "../..");
const FORBIDDEN = ["lib/i18n/index.ts", "lib/i18n/fr.ts", "lib/i18n/en.ts", "lib/i18n/faq.ts"].map((file) => path.join(SRC, file));

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function resolve(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(from), specifier);
  else return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Runtime imports only: `import type` / `export type` and all-type specifier lists are erased. */
function runtimeImports(file: string): string[] {
  const source = fs.readFileSync(file, "utf8");
  const found: string[] = [];
  const statement = /(?:^|\n)\s*(import|export)\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(statement)) {
    if (match[2]) continue;
    const clause = match[3]!.trim();
    const named = clause.match(/^\{([\s\S]*)\}$/);
    if (named && named[1]!.split(",").map((part) => part.trim()).filter(Boolean).every((part) => part.startsWith("type "))) continue;
    found.push(match[4]!);
  }
  for (const match of source.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) found.push(match[1]!);
  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) found.push(match[1]!);
  return found;
}

describe("client i18n boundary", () => {
  it("never bundles both dictionaries into client code", () => {
    const entries = sourceFiles(SRC).filter((file) => /^\s*["']use client["']/.test(fs.readFileSync(file, "utf8")));
    expect(entries.length).toBeGreaterThan(10);
    const parent = new Map<string, string>();
    const queue = [...entries];
    const seen = new Set(entries);
    const offenders: string[] = [];
    while (queue.length) {
      const file = queue.shift()!;
      for (const specifier of runtimeImports(file)) {
        const target = resolve(file, specifier);
        if (!target || seen.has(target)) continue;
        seen.add(target);
        parent.set(target, file);
        if (FORBIDDEN.includes(target)) {
          const chain = [target];
          for (let at = file; at; at = parent.get(at)!) chain.unshift(at);
          offenders.push(chain.map((item) => path.relative(SRC, item)).join(" -> "));
          continue;
        }
        queue.push(target);
      }
    }
    expect(offenders).toEqual([]);
  });
});
