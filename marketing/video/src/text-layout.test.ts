import { describe, expect, it } from "vitest";
import { fitText, isUrlLike } from "./text-layout";

const measure = (value: string, size: number) => Array.from(value).length * size * 0.6;

describe("URL and handle text layout", () => {
  it.each(["duoshot.site", "duoshot.site/en/guides", "https://duoshot.site/en/guides", "@Spocsk", "duoshot.site.", "duoshot.site,", "(duoshot.site)", "«duoshot.site»", "duoshot.site/en/guides!"])("recognizes %s", (token) => {
    expect(isUrlLike(token)).toBe(true);
  });

  it.each([
    ["Guides: duoshot.site/en/guides", ["duoshot.site/en/guides"], 70],
    ["Try duoshot.site/en/guides.", ["duoshot.site/en/guides."], 66],
    ["DuoShot by @Spocsk · duoshot.site", ["@Spocsk", "duoshot.site"], 104],
    ["Guides: https://duoshot.site/en/guides?utm_source=x", ["https://duoshot.site/en/guides?utm_source=x"], 36],
  ] as const)("keeps end card tokens whole: %s", (text, tokens, size) => {
    const fitted = fitText(text, 936, 620, 84, 104, measure);
    const lines = fitted.pages.flat();
    for (const token of tokens) expect(lines.some((line) => line.includes(token))).toBe(true);
    for (const line of lines) expect(measure(line, fitted.size)).toBeLessThanOrEqual(936);
    expect(fitted.size).toBe(size);
  });

  it("wraps oversized URLs at slashes only after reaching the floor", () => {
    const token = "duoshot.site/en/guides";
    const fitted = fitText(token, 190, 620, 84, 104, measure);
    expect(fitted.size).toBe(24);
    expect(fitted.pages.flat()).toEqual(["duoshot.site/", "en/guides"]);
    for (const line of fitted.pages.flat()) expect(measure(line, fitted.size)).toBeLessThanOrEqual(190);
  });

  it("splits an oversized URL segment only as a last resort", () => {
    const token = "duoshot.site/abcdefghijklmnopqrstuv/guide";
    const fitted = fitText(token, 190, 620, 84, 104, measure);
    const lines = fitted.pages.flat();
    expect(fitted.size).toBe(24);
    expect(lines).toEqual(["duoshot.site/", "abcdefghijklm", "nopqrstuv/", "guide"]);
    expect(lines.join("")).toBe(token);
    for (const line of lines) expect(measure(line, fitted.size)).toBeLessThanOrEqual(190);
  });

  it("honors a minimum below 24 as the font floor", () => {
    const fitted = fitText("@abcdefghijklmnopqrstuv", 190, 620, 16, 104, measure);
    expect(fitted.size).toBe(16);
    for (const line of fitted.pages.flat()) expect(measure(line, fitted.size)).toBeLessThanOrEqual(190);
  });

  it("keeps character splitting for long non-URL filenames", () => {
    const filename = "very_long_filename_for_an_exported_outer_capture.png";
    expect(isUrlLike(filename)).toBe(false);
    const fitted = fitText(filename, 936, 620, 84, 104, measure);
    expect(fitted.size).toBe(104);
    expect(fitted.pages.flat().length).toBeGreaterThan(1);
    expect(fitted.pages.flat().join("")).toBe(filename);
    for (const line of fitted.pages.flat()) expect(measure(line, fitted.size)).toBeLessThanOrEqual(936);
  });
});
