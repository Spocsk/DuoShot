import { describe, expect, it } from "vitest";
import { duoPicks, validateDuoSelection, type DuoSelection } from "./duo-selection";

describe("Duo slot selection", () => {
  it("defaults to outer only for older clients", () => {
    expect(validateDuoSelection(undefined, 10, 10)).toHaveLength(10);
    expect(duoPicks(undefined, 1, 10)).toEqual([{ side: "outer", index: 0 }]);
  });
  it("allows inner only without outer sources", () => {
    expect(validateDuoSelection({ mode: "inner" }, 0, 1)).toEqual([{ side: "inner", index: 0 }]);
  });
  it("preserves individual source indices and selection order", () => {
    const picks = [{ side: "inner" as const, index: 3 }, { side: "outer" as const, index: 1 }];
    expect(validateDuoSelection({ mode: "mix", picks }, 4, 4)).toEqual(picks);
  });
  it("counts both sizes together, including same-set captures", () => {
    const picks = Array.from({ length: 6 }, (_, index) => [{ side: "outer" as const, index }, { side: "inner" as const, index }]).flat();
    expect(validateDuoSelection({ mode: "mix", picks: picks.slice(0, 10) }, 6, 6)).toHaveLength(10);
    expect(() => validateDuoSelection({ mode: "mix", picks: picks.slice(0, 11) }, 6, 6)).toThrow("DUO_SLOT_LIMIT");
    expect(() => validateDuoSelection({ mode: "outer" }, 11, 0)).toThrow("DUO_SLOT_LIMIT");
  });
  it.each([
    { mode: "mix", picks: [{ side: "outer", index: 0 }, { side: "outer", index: 0 }] },
    { mode: "mix", picks: [{ side: "inner", index: 2 }] },
    { mode: "mix", picks: [{ side: "outer", index: -1 }] },
    { mode: "mix", picks: [{ side: "outer", index: 0.5 }] },
    { mode: "mix", picks: [{ side: "bad", index: 0 }] },
    { mode: "mix" }, { mode: "bad" }, {},
  ])("rejects malformed or duplicate picks (%j)", (selection) => {
    expect(() => validateDuoSelection(selection as DuoSelection, 2, 2)).toThrow("INVALID_DUO_SELECTION");
  });
  it("rejects an empty selection", () => {
    expect(() => validateDuoSelection({ mode: "mix", picks: [] }, 2, 2)).toThrow("DUO_SELECTION_EMPTY");
  });
});
