import { describe, expect, it } from "vitest";
import { DEFAULT_RENDER_OPTIONS, overlayTextColor } from "./specs";

describe("overlayTextColor", () => {
  it("keeps light text on the default dark background", () => {
    expect(overlayTextColor(DEFAULT_RENDER_OPTIONS)).toBe("#FFFFFF");
  });
  it("switches to ink on a light solid background", () => {
    expect(overlayTextColor({ ...DEFAULT_RENDER_OPTIONS, solidColor: "#F7F9FA" })).toBe("#172126");
  });
  it("averages both gradient stops", () => {
    expect(overlayTextColor({ ...DEFAULT_RENDER_OPTIONS, background: "gradient", gradientFrom: "#FFFFFF", gradientTo: "#E9EFF1" })).toBe("#172126");
    expect(overlayTextColor({ ...DEFAULT_RENDER_OPTIONS, background: "gradient", gradientFrom: "#10141C", gradientTo: "#2A1A4A" })).toBe("#FFFFFF");
  });
  it("uses light text on darkened blur backgrounds", () => {
    expect(overlayTextColor({ ...DEFAULT_RENDER_OPTIONS, background: "blur", solidColor: "#FFFFFF" })).toBe("#FFFFFF");
  });
});
