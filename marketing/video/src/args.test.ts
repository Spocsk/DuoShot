import { describe, expect, it } from "vitest";
import { parseConvertArgs, parseRenderArgs } from "./cli/args";

describe("render arguments", () => {
  it("defaults to three platforms and /workspace/videos/", () => {
    expect(parseRenderArgs(["scripts/v1.json"])).toEqual({ files: ["scripts/v1.json"], platforms: ["tiktok", "instagram", "youtube"], outDir: "/workspace/videos/" });
  });
  it("reads environment and explicit options with multiple scripts", () => {
    expect(parseRenderArgs(["a.json", "--platform", "tiktok,youtube,tiktok", "b.json", "--out", "out", "--concurrency", "2"], { VIDEO_OUT_DIR: "env-out" }))
      .toEqual({ files: ["a.json", "b.json"], platforms: ["tiktok", "youtube"], outDir: "out", concurrency: 2 });
    expect(parseRenderArgs(["a.json"], { VIDEO_OUT_DIR: "env-out" }).outDir).toBe("env-out");
  });
  it.each([[], ["a.json", "--other"], ["a.json", "--out"], ["a.json", "--platform", "facebook"], ["a.json", "--platform", ""], ["a.json", "--concurrency", "0"], ["a.json", "--concurrency", "1.5"], ["a.json", "--concurrency", "NaN"]].map((args) => ({ args })))("rejects invalid args $args", ({ args }) => {
    expect(() => parseRenderArgs(args)).toThrow();
  });
});

describe("convert arguments", () => {
  it("reads input and optional output", () => {
    expect(parseConvertArgs(["example.md"])).toEqual({ file: "example.md", outDir: "scripts" });
    expect(parseConvertArgs(["example.md", "--out", "tmp"])).toEqual({ file: "example.md", outDir: "tmp" });
  });
  it("rejects missing input or option values", () => {
    expect(() => parseConvertArgs([])).toThrow();
    expect(() => parseConvertArgs(["example.md", "--out"])).toThrow();
  });
});
