import { describe, expect, it } from "vitest";
import { defaultSet, nextSetName } from "./sets-store";

describe("set names", () => {
  it("numbers new sets Composition 01, 02…", () => {
    expect(nextSetName()).toBe("Composition 01");
    expect(nextSetName([{ name: "Composition 01" }, { name: "Harbor (exemple)" }])).toBe("Composition 02");
    expect(defaultSet([{ name: "Composition 01" }, { name: "Composition 03" }]).name).toBe("Composition 02");
  });
});
