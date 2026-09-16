import { describe, expect, it } from "vitest";
import type { Orientation } from "../specs";
import { assertSingleOrientation, checkSourceCount } from "./validate";

describe("validate", () => {
  it("rejects an empty drop", () => {
    expect(() => checkSourceCount(0)).toThrow("NO_IMAGES");
  });

  it("accepts portrait and landscape only", () => {
    expect(assertSingleOrientation("portrait")).toBe("portrait");
    expect(assertSingleOrientation("landscape")).toBe("landscape");
    expect(() => assertSingleOrientation("square" as Orientation)).toThrow("ORIENTATION_INVALID");
  });
});
