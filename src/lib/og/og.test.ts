import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ogAlt, type OgPage } from "./cards";
import { ogImage } from "./index";

const APP = path.join(process.cwd(), "src/app/[locale]");

function pageDirs(dir: string): string[] {
  const own = existsSync(path.join(dir, "page.tsx")) ? [dir] : [];
  return own.concat(
    readdirSync(dir)
      .map((name) => path.join(dir, name))
      .filter((child) => statSync(child).isDirectory())
      .flatMap(pageDirs),
  );
}

const PAGES: OgPage[] = ["home", "specs", "rejection", "pricing", "why-not-ai", "tool", "review", "legal", "subprocessors", "terms", "privacy", "cookies"];

describe("social cards", () => {
  // pageMetadata() sets openGraph, which drops the parent's image: each page needs its own file.
  it("gives every page an opengraph-image file", () => {
    const missing = pageDirs(APP).filter((dir) => {
      const owner = dir !== APP && path.basename(dir).startsWith("[") ? path.dirname(dir) : dir;
      return !existsSync(path.join(owner, "opengraph-image.tsx"));
    });
    expect(missing.map((dir) => path.relative(APP, dir))).toEqual([]);
  });

  it("has alt text in both languages", () => {
    for (const page of PAGES) {
      expect(ogAlt(page, "fr")).not.toBe(ogAlt(page, "en"));
    }
  });

  it.each(PAGES)("renders the %s card as a 1200 × 630 PNG", async (page) => {
    const png = Buffer.from(await (await ogImage(page, "fr")).arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }, 20_000);
});
