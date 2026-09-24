import { describe, expect, it } from "vitest";
import { SIZE_SPECS, type SizeSpec } from "../specs";
import { buildReadme, zipEntryPath } from "./zip";

const outer = SIZE_SPECS.find((item) => item.id === "outer-p") as SizeSpec;
const sixtyNine = SIZE_SPECS.find((item) => item.id === "69a-p") as SizeSpec;

describe("zip", () => {
  it("builds Connect paths with optional client prefix", () => {
    expect(
      zipEntryPath({
        appName: "Harbor",
        spec: outer,
        index: 0,
        format: "png",
      }),
    ).toBe("harbor/duo-outer-portrait/01.png");
    expect(
      zipEntryPath({
        appName: "Harbor",
        clientSlug: "Acme",
        spec: outer,
        index: 1,
        format: "jpeg",
      }),
    ).toBe("acme/harbor/duo-outer-portrait/02.jpg");
  });

  it("nests 6.9-inch sizes under pixel folders", () => {
    expect(
      zipEntryPath({
        appName: "Harbor",
        spec: sixtyNine,
        index: 0,
        format: "png",
      }),
    ).toBe("harbor/iphone-69-portrait/1320x2868/01.png");
  });

  it("documents clone scores and unpaired slides", () => {
    const readme = buildReadme({
      appName: "Harbor",
      orientation: "portrait",
      branded: true,
      include69: true,
      unpaired: true,
      flattenAlpha: true,
      cloneScores: [{ index: 0, distance: 0, label: "risk" }],
    });
    expect(readme).toContain("iphone-69-portrait");
    expect(readme).toContain("outer/inner counts differ");
    expect(readme).toContain("01: RISK 2.3.3");
    expect(readme).toContain("source had transparency");
    expect(readme).toContain("Préparé avec DuoShot");
  });

  it("lists exact Connect pixels per folder", () => {
    const readme = buildReadme({
      appName: "Harbor",
      orientation: "portrait",
      branded: false,
      include69: false,
      pixels: ["duo-outer-portrait: 1398x2034", "duo-inner-portrait: 2007x2853"],
    });
    expect(readme).toContain("duo-outer-portrait: 1398x2034");
    expect(readme).toContain("duo-inner-portrait: 2007x2853");
  });
});
