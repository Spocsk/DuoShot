import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_KEYS } from "./client-keys";
import { fr } from "./fr";

/*
 * Client code only receives the messages it renders:
 * - no "use client" module may reach a module that loads both dictionaries;
 * - CLIENT_KEYS lists the keys client components use, per scope. "site" is sent by the
 *   root layouts, "app" is added by pages that render <MessagesScope scope="app">.
 *   Regenerate it with `npm run i18n:keys` after adding or removing a key in a client component.
 */

const SRC = path.resolve(__dirname, "../..");
const FORBIDDEN = ["lib/i18n/index.ts", "lib/i18n/fr.ts", "lib/i18n/en.ts", "lib/i18n/faq.ts"].map((file) => path.join(SRC, file));
const KEYS = Object.keys(fr);
const KEY_SET = new Set(KEYS);

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

const read = (file: string) => fs.readFileSync(file, "utf8");
const isClient = (file: string) => /^\s*["']use client["']/.test(read(file));

/** Runtime imports only: `import type` / `export type` and all-type specifier lists are erased. */
function runtimeImports(file: string): string[] {
  const source = read(file);
  const found: string[] = [];
  const statement = /(?:^|\n)\s*(import|export)\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(statement)) {
    if (match[2]) continue;
    const named = match[3]!.trim().match(/^\{([\s\S]*)\}$/);
    if (named && named[1]!.split(",").map((part) => part.trim()).filter(Boolean).every((part) => part.startsWith("type "))) continue;
    found.push(match[4]!);
  }
  for (const match of source.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) found.push(match[1]!);
  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) found.push(match[1]!);
  return found.map((specifier) => resolve(file, specifier)).filter((target): target is string => !!target);
}

/** Files reachable from `entries`; once a "use client" module is crossed, everything below it is client code. */
function graph(entries: string[]) {
  const all = new Set<string>();
  const client = new Set<string>();
  const queue: [string, boolean][] = entries.map((file) => [file, isClient(file)]);
  while (queue.length) {
    const [file, inClient] = queue.shift()!;
    const clientHere = inClient || isClient(file);
    if (clientHere ? client.has(file) : all.has(file)) continue;
    all.add(file);
    if (clientHere) client.add(file);
    for (const target of runtimeImports(file)) queue.push([target, clientHere]);
  }
  return { all, client };
}

/** Message keys a file can ask for: key literals, `prefix_${…}` templates, and `_one` variants. */
function keysIn(file: string): Set<string> {
  const source = read(file);
  const keys = new Set<string>();
  for (const match of source.matchAll(/["'`]([a-z0-9]+(?:_[a-z0-9]+)+)["'`]/g)) if (KEY_SET.has(match[1]!)) keys.add(match[1]!);
  for (const match of source.matchAll(/`([a-z0-9_]*_)\$\{[^}`]*\}([a-z0-9_]*)`/g)) {
    const [, head, tail] = match;
    for (const key of KEYS) if (key.startsWith(head!) && key.endsWith(tail!) && key.length > head!.length + tail!.length) keys.add(key);
  }
  for (const key of [...keys]) if (KEY_SET.has(`${key}_one`)) keys.add(`${key}_one`);
  return keys;
}

function clientKeys(entries: string[]): Set<string> {
  const keys = new Set<string>();
  for (const file of graph(entries).client) for (const key of keysIn(file)) keys.add(key);
  return keys;
}

const APP = path.join(SRC, "app");
const layouts = sourceFiles(APP).filter((file) => /\/layout\.tsx$/.test(file));
const pages = sourceFiles(APP).filter((file) => /\/page\.tsx$/.test(file));
const usesAppScope = (file: string) => /<MessagesScope\b[^>]*scope="app"/.test(read(file));

function computeScopes() {
  const site = clientKeys(layouts);
  const app = new Set<string>();
  for (const page of pages) {
    const keys = clientKeys([page]);
    for (const key of keys) (usesAppScope(page) ? app : site).add(key);
  }
  for (const key of site) app.delete(key);
  const sorted = (set: Set<string>) => KEYS.filter((key) => set.has(key));
  return { site: sorted(site), app: sorted(app) };
}

describe("client i18n boundary", () => {
  it("never bundles both dictionaries into client code", () => {
    const entries = sourceFiles(SRC).filter(isClient);
    expect(entries.length).toBeGreaterThan(10);
    const parent = new Map<string, string>();
    const seen = new Set(entries);
    const queue = [...entries];
    const offenders: string[] = [];
    while (queue.length) {
      const file = queue.shift()!;
      for (const target of runtimeImports(file)) {
        if (seen.has(target)) continue;
        seen.add(target);
        parent.set(target, file);
        if (FORBIDDEN.includes(target)) {
          const chain = [target];
          for (let at: string | undefined = file; at; at = parent.get(at)) chain.unshift(at);
          offenders.push(chain.map((item) => path.relative(SRC, item)).join(" -> "));
          continue;
        }
        queue.push(target);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("sends every key client components use, and only those (npm run i18n:keys to refresh)", () => {
    const scopes = computeScopes();
    if (process.env.I18N_WRITE_CLIENT_KEYS) {
      const list = (keys: string[]) => keys.map((key) => `    "${key}",`).join("\n");
      fs.writeFileSync(path.join(__dirname, "client-keys.ts"), `import type { MessageKey } from "./types";

/*
 * Generated by \`npm run i18n:keys\` from the client components' imports; checked by
 * client-boundary.test.ts. "site" ships with every page, "app" only with pages that
 * render <MessagesScope scope="app"> (tool, account, review, invitation).
 */
export const CLIENT_KEYS = {
  site: [
${list(scopes.site)}
  ],
  app: [
${list(scopes.app)}
  ],
} as const satisfies Record<"site" | "app", readonly MessageKey[]>;
`);
    }
    expect({ site: [...CLIENT_KEYS.site], app: [...CLIENT_KEYS.app] }).toEqual(scopes);
  });
});
