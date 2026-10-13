import { describe, expect, it } from "vitest";
import { SIZE_SPECS, type SizeSpec } from "../specs";
import { buildReadme, buildZip, zipEntryPath } from "./zip";

const outer = SIZE_SPECS.find((item) => item.id === "outer-p") as SizeSpec;
const sixtyNine = SIZE_SPECS.find((item) => item.id === "69a-p") as SizeSpec;

describe("zip", () => {
  it("rejects overfull normal ZIPs at the builder boundary", async () => {
    const images = Array.from({ length: 11 }, (_, index) => ({ spec: outer, index, buffer: Buffer.alloc(1) }));
    await expect(buildZip({ appName: "Cap", orientation: "portrait", branded: false, include69: false, format: "png", images })).rejects.toThrow("DUO_SLOT_LIMIT");
  });
  it("labels raw examples and documents the shared cap and untested status", () => {
    const readme = buildReadme({ appName: "Raw", orientation: "portrait", branded: false, include69: false, rawDuoSets: true });
    expect(readme).toContain("Raw outer + inner sets: pick up to 10");
    expect(readme).toContain("APP_IPHONE_DUO");
    expect(readme).toContain("Not yet tested by DuoShot");
    expect(readme).toContain("April 2027 for apps built with the iOS 27.1 SDK or later");
  });

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
      rawDuoSets: true,
      flattenAlpha: true,
      cloneScores: [{ index: 0, distance: 0, label: "risk" }],
    });
    expect(readme).toContain("iphone-69-portrait");
    expect(readme).toContain("outer/inner counts differ");
    expect(readme).toContain("01: RISK 2.3.3");
    expect(readme).toContain("source had transparency");
    expect(readme).toContain("Préparé avec DuoShot");
    expect(readme).toContain("April 2027 for apps built with the iOS 27.1 SDK or later");
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
