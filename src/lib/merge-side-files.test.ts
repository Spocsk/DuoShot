import { describe, expect, it } from "vitest";
import { mergeSideFiles } from "./merge-side-files";

function files(...names: string[]) {
  return names.map((name) => new File([name], name, { type: "image/png" }));
}

describe("mergeSideFiles", () => {
  it("appends until the cap", () => {
    const next = mergeSideFiles(files("a.png"), files("b.png", "c.png"));
    expect(next.map((file) => file.name)).toEqual(["a.png", "b.png", "c.png"]);
  });

  it("replaces when a full batch of 10 arrives", () => {
    const incoming = files(...Array.from({ length: 10 }, (_, i) => `${i}.png`));
    const next = mergeSideFiles(files("old.png"), incoming);
    expect(next).toHaveLength(10);
    expect(next[0]?.name).toBe("0.png");
  });
});
