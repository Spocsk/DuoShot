import { describe, expect, it } from "vitest";
import { parseRenderBody } from "./request";
import { assertBatchSize, MAX_SOURCE_BYTES } from "./limits";

describe("render input boundary", () => {
  it.each([null, [], 1, { outerPaths: "user/a.png" }, { outerPaths: [null] }, { appName: 3 }, { sameSet: "false" }])("rejects malformed JSON payload %j", (body) => {
    expect(() => parseRenderBody(body, "user")).toThrow();
  });
  it.each(["other/a.png", "user/../other/a.png", "user/%2e%2e/a.png", "user/a.png?download=1"])("rejects ambiguous or foreign path %s", (path) => {
    expect(() => parseRenderBody({ paths: [path] }, "user")).toThrow("PATH_FORBIDDEN");
  });
  it("rejects SVG injection and unsupported render options", () => {
    expect(() => parseRenderBody({ options: { gradientFrom: '#fff"/><image href="https://example.com' } }, "user")).toThrow("INVALID_OPTIONS");
    expect(() => parseRenderBody({ options: { orientation: "sideways" } }, "user")).toThrow("INVALID_OPTIONS");
  });
  it("enforces a total batch budget in addition to per-file limits", () => {
    expect(() => assertBatchSize(Array.from({ length: 5 }, () => ({ size: MAX_SOURCE_BYTES })))).toThrow("BATCH_TOO_LARGE");
    expect(() => assertBatchSize([{ size: MAX_SOURCE_BYTES + 1 }])).toThrow("INPUT_TOO_LARGE");
    expect(() => assertBatchSize([{ size: 1000 }])).not.toThrow();
  });
});
