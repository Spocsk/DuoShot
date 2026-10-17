import { readFileSync } from "node:fs";
import path from "node:path";
import type { Locale } from "./specs";

export const COMPARISON_GUIDE_PATH = "/guides/best-app-store-screenshot-generator";
export const ASC_GUIDE_PATH = "/guides/iphone-duo-app-store-connect";

export function comparisonGuide(locale: Locale) {
  return readGuide(locale, COMPARISON_GUIDE_PATH);
}

export function appStoreConnectGuide(locale: Locale) {
  return readGuide(locale, ASC_GUIDE_PATH);
}

/** The checked-in guides use flat string frontmatter; the body stays untouched. */
function readGuide(locale: Locale, guidePath: string) {
  const source = readFileSync(path.join(process.cwd(), `content${guidePath}.${locale}.md`), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing guide frontmatter: ${locale}`);
  const fields = Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
    const colon = line.indexOf(":");
    return [line.slice(0, colon), line.slice(colon + 1).trim().replace(/^"(.*)"$/, "$1")];
  }));
  for (const field of ["title", "description", "lang", "slug", "alternate", "updated"]) {
    if (!fields[field]) throw new Error(`Missing guide ${field}: ${locale}`);
  }
  if (fields.lang !== locale) throw new Error(`Incorrect guide language: ${locale}`);
  return { title: fields.title, description: fields.description, dateModified: fields.updated, body: match[2] };
}
