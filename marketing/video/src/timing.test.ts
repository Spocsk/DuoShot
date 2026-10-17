import { expect, it } from "vitest";
import v1 from "../scripts/v1-accepts.json";
import { validateScript } from "./schema";
import { FPS, sceneTiming } from "./timing";
import { capturePath } from "./assets";

it("rounds cumulative frame boundaries without accumulating drift", () => {
  const script = validateScript({ ...v1, scenes: Array.from({ length: 7 }, () => ({ type: "title", text: "Accepted sizes", durationSec: 18 / 7 })) });
  const timing = sceneTiming(script);
  expect(timing.reduce((sum, scene) => sum + scene.durationInFrames, 0)).toBe(18 * FPS);
  timing.slice(1).forEach((scene, i) => expect(scene.from).toBe(timing[i].from + timing[i].durationInFrames));
});

it("resolves a Harbor reference or preserves a local relative path", () => {
  expect(capturePath("harbor:fr:2:inner")).toBe("captures/harbor/fr/02-inner.png");
  expect(capturePath("custom/screen.png")).toBe("custom/screen.png");
});

it("preserves minimum-length scenes and the exact total", () => {
  const script = validateScript({ ...v1, scenes: [
    { type: "title", text: "Accepted sizes", durationSec: 0.5 },
    { type: "title", text: "Real captures", durationSec: 17 },
    { type: "end", text: "duoshot.site", durationSec: 0.5 },
  ] });
  expect(sceneTiming(script)).toEqual([{ from: 0, durationInFrames: 15 }, { from: 15, durationInFrames: 510 }, { from: 525, durationInFrames: 15 }]);
});
