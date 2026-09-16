import { describe, expect, it } from "vitest";
import { compositionMetrics, containRect, coverRect, parseHexColor, slugify } from "./geometry";

describe("geometry", () => {
  it("fits the source inside the destination", () => {
    expect(containRect(200, 100, 100, 100)).toEqual({
      left: 0,
      top: 25,
      width: 100,
      height: 50,
    });
  });

  it("covers the destination and centers overflow", () => {
    expect(coverRect(100, 50, 100, 100)).toEqual({
      left: -50,
      top: 0,
      width: 200,
      height: 100,
    });
  });

  it("measures crop, upscale, and focal placement", () => {
    const metrics = compositionMetrics(200, 100, 100, 100, { fit: "cover", x: 1, y: 0.5 });
    expect(metrics.cropPercent).toBe(50);
    expect(metrics.scale).toBe(1);
    expect(metrics.severity).toBe("severe");
    expect(metrics.rect).toEqual({ left: -100, top: 0, width: 200, height: 100 });
  });

  it("flags large upscales even without crop", () => {
    const metrics = compositionMetrics(200, 200, 1000, 1000, { fit: "contain", x: 0.5, y: 0.5 });
    expect(metrics.cropPercent).toBe(0);
    expect(metrics.scale).toBe(5);
    expect(metrics.severity).toBe("severe");
  });

  it("parses hex colors including shorthand", () => {
    expect(parseHexColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHexColor("#0b0d12")).toEqual({ r: 11, g: 13, b: 18 });
    expect(parseHexColor("nope")).toEqual({ r: 11, g: 13, b: 18 });
  });

  it("slugifies names and falls back to app", () => {
    expect(slugify("Mon App")).toBe("mon-app");
    expect(slugify("Café Studio!")).toBe("cafe-studio");
    expect(slugify("@@@")).toBe("app");
  });
});
