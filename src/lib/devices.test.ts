import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEVICES, DEVICE_SLUGS, deviceBySlug } from "./devices";
import { devicePageCopy } from "./device-page-copy";
import { SCREENSHOT_SIZES } from "./screenshot-pages";

const SOURCE = readFileSync(
  path.join(process.cwd(), "docs/sources/apple-screenshot-specifications-2026-11-03.txt"),
  "utf8",
);

/** Collapse "×"/"x" and whitespace so "1398 × 2034" and "1398x2034" compare equal. */
const normalizeSizes = (text: string) => text.replace(/×/g, "x").replace(/\s+/g, "").toLowerCase();
const NORMALIZED_SOURCE = normalizeSizes(SOURCE);

function frStrings(): string[] {
  return DEVICES.flatMap((device) => {
    const copy = devicePageCopy("fr", device);
    return [
      device.group.fr,
      device.requirement.fr,
      ...device.commonErrors.fr,
      copy.h1,
      copy.title,
      copy.description,
      copy.answer,
      ...copy.faq.flatMap((item) => [item.q, item.a]),
    ];
  });
}

describe("DEVICES data", () => {
  it("has unique slugs", () => {
    expect(new Set(DEVICE_SLUGS).size).toBe(DEVICES.length);
  });

  it("covers roughly 32 devices across every platform", () => {
    expect(DEVICES.length).toBeGreaterThanOrEqual(32);
    expect(new Set(DEVICES.map((device) => device.platform))).toEqual(
      new Set(["iphone", "ipad", "mac", "tv", "vision", "watch"]),
    );
  });

  it("uses Apple device names that appear verbatim in the source file", () => {
    for (const device of DEVICES) {
      expect(SOURCE, device.slug).toContain(device.name);
    }
  });

  it("only lists pixel sizes copied verbatim from the source file", () => {
    for (const device of DEVICES) {
      for (const size of device.sizes) {
        const candidate = `${size.width}x${size.height}`;
        expect(NORMALIZED_SOURCE, `${device.slug} ${candidate}`).toContain(candidate);
      }
    }
  });

  it("lists exactly the four iPhone Duo sizes", () => {
    const duo = deviceBySlug("iphone-duo")!;
    expect(duo.sizes.map((size) => `${size.width}x${size.height}`)).toEqual([
      "1398x2034",
      "2034x1398",
      "2007x2853",
      "2853x2007",
    ]);
  });

  it("never claims both iPhone Duo sizes are required", () => {
    const duo = deviceBySlug("iphone-duo")!;
    const copyFr = devicePageCopy("fr", duo);
    const copyEn = devicePageCopy("en", duo);
    const strings = [
      duo.requirement.fr,
      duo.requirement.en,
      copyFr.answer,
      copyEn.answer,
      ...copyFr.faq.flatMap((item) => [item.q, item.a]),
      ...copyEn.faq.flatMap((item) => [item.q, item.a]),
    ];
    for (const text of strings) {
      expect(text).not.toMatch(/both\s+(duo\s+)?(sizes|displays|screenshots)\s+(are\s+)?required/i);
      expect(text).not.toMatch(/les deux (tailles|écrans)[^.]*(requis|requises|obligatoires)/i);
    }
  });

  it("addresses French readers with « vous », never « tu »", () => {
    for (const text of frStrings()) {
      expect(text, text).not.toMatch(/\btu\b/i);
    }
  });

  it("resolves every neighbor to a known device", () => {
    for (const device of DEVICES) {
      expect(device.neighbors.length).toBeGreaterThanOrEqual(2);
      expect(device.neighbors.length).toBeLessThanOrEqual(4);
      for (const neighbor of device.neighbors) {
        expect(neighbor, `${device.slug} -> ${neighbor}`).not.toBe(device.slug);
        expect(DEVICE_SLUGS, `${device.slug} -> ${neighbor}`).toContain(neighbor);
      }
    }
  });

  it("points the generator link at an existing size page or the tool", () => {
    for (const device of DEVICES) {
      if (device.generatorSize) {
        expect(SCREENSHOT_SIZES, device.slug).toContain(device.generatorSize);
      } else {
        expect(device.toolPath, device.slug).toBe(true);
      }
    }
  });

  it("keeps every meta description within the 160 character budget", () => {
    for (const device of DEVICES) {
      for (const locale of ["fr", "en"] as const) {
        const { description } = devicePageCopy(locale, device);
        expect([...description].length, `${locale} ${device.slug}: ${description}`).toBeLessThanOrEqual(160);
      }
    }
  });

  it("builds one direct-answer sentence naming the display group", () => {
    for (const device of DEVICES) {
      for (const locale of ["fr", "en"] as const) {
        const { answer } = devicePageCopy(locale, device);
        expect(answer, `${locale} ${device.slug}`).toContain(device.group[locale]);
        expect(answer).toContain(locale === "fr" ? "App Store Connect accepte ces tailles pour le groupe" : "App Store Connect accepts these sizes for the");
      }
    }
  });
});
