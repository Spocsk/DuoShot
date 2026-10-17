import { describe, expect, it } from "vitest";
import { validateOutputs } from "./cli/outputs";
import { platforms } from "./schema";

describe("output preflight", () => {
  it("allows distinct complete output sets", () => {
    expect(() => validateOutputs([{ id: "v1-accepts" }, { id: "v2-real" }], [...platforms], "/tmp/videos")).not.toThrow();
  });
  it("rejects duplicate IDs even without platform variants", () => {
    expect(() => validateOutputs([{ id: "same" }, { id: "same" }], [], "/tmp/videos")).toThrow("Identifiant dupliqué : same");
  });
  it.each(platforms)("rejects master / %s copy collisions in either script order", (platform) => {
    const scripts = [{ id: "demo" }, { id: `demo-${platform}` }];
    for (const order of [scripts, [...scripts].reverse()]) {
      expect(() => validateOutputs(order, [...platforms], "/tmp/videos")).toThrow(`Collision de sortie : /tmp/videos/demo-${platform}.mp4`);
    }
  });
  it("rejects repeated platform outputs", () => {
    expect(() => validateOutputs([{ id: "demo" }], ["tiktok", "tiktok"], "/tmp/videos")).toThrow("Collision de sortie");
  });
});
