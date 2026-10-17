import { createElement, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import v1 from "../scripts/v1-accepts.json";
import v2 from "../scripts/v2-real.json";
import { SocialVideo } from "./SocialVideo";
import { captureScale, reframeDimensions, sceneOpacity } from "./layout";
import { validateScript, type Scene, type VideoScript } from "./schema";

const clock = vi.hoisted(() => ({ frame: 0, duration: 540 }));
vi.mock("./fonts", () => ({ sans: "Geist", useFonts: () => true }));
vi.mock("./Capture", () => ({ Capture: (props: object) => createElement("capture", props) }));
vi.mock("./Text", () => ({ Text: (props: object) => createElement("copy", props) }));
vi.mock("remotion", async (original) => ({
  ...await original<typeof import("remotion")>(),
  AbsoluteFill: "fill", Sequence: "sequence", Img: "img",
  useCurrentFrame: () => clock.frame,
  useVideoConfig: () => ({ fps: 30, durationInFrames: clock.duration }),
  getStaticFiles: () => [],
}));

interface Item { tag: string; props: Record<string, unknown>; opacity: number; frame: number; duration: number }
// Evaluate the component tree with local Sequence clocks; no browser, assets or video rendering.
function inspect(script: VideoScript, frame: number) {
  clock.frame = frame; clock.duration = script.durationSec * 30;
  const items: Item[] = [];
  const visit = (node: ReactNode, opacity = 1): void => {
    if (Array.isArray(node)) { node.forEach((child) => visit(child, opacity)); return; }
    if (!isValidElement<Record<string, unknown>>(node)) return;
    const props = node.props;
    if (node.type === "sequence") {
      const from = Number(props.from ?? 0);
      const duration = Number(props.durationInFrames);
      if (clock.frame < from || clock.frame >= from + duration) return;
      const previous = { ...clock };
      clock.frame -= from; clock.duration = duration;
      visit(props.children as ReactNode, opacity);
      Object.assign(clock, previous);
      return;
    }
    if (typeof node.type === "function") {
      visit((node.type as (props: Record<string, unknown>) => ReactNode)(props), opacity);
      return;
    }
    const style = props.style as { opacity?: number } | undefined;
    const visible = opacity * (style?.opacity ?? 1);
    if (typeof node.type === "string") items.push({ tag: node.type, props, opacity: visible, frame: clock.frame, duration: clock.duration });
    visit(props.children as ReactNode, visible);
  };
  visit(createElement(SocialVideo, script));
  return items;
}
const single = (scene: Scene): VideoScript => ({ ...validateScript(v1), durationSec: scene.durationSec, scenes: [scene] });
const copy = (items: Item[], text: string) => items.find((item) => item.tag === "copy" && item.props.children === text);
const capture = (items: Item[], kind: string) => items.find((item) => item.tag === "capture" && item.props.kind === kind)!;

beforeEach(() => { clock.frame = 0; clock.duration = 540; });
describe("scene component wiring", () => {
  it("shows the opening title at frame zero and keeps the two sample scripts valid", () => {
    for (const sample of [v1, v2]) {
      const script = validateScript(sample);
      expect(copy(inspect(script, 0), script.scenes[0].text!)?.opacity).toBe(1);
    }
    const script = single({ type: "title", text: "Accepted sizes", durationSec: 0.5, theme: "dark" });
    expect(copy(inspect(script, 0), "Accepted sizes")?.opacity).toBe(1);
  });
  it("uses the exact same scale in singles and on both ends of outer-to-inner", () => {
    for (const kind of ["outer", "inner", "classic"] as const) {
      const script = single({ type: kind, capture: `harbor:en:1:${kind}`, durationSec: 4 });
      expect(capture(inspect(script, 20), kind).props.scale).toBe(captureScale);
    }
    const script = single(validateScript(v1).scenes[2]);
    for (const [frame, innerLabel] of [[0, 0], [9, 0], [12, 0.5], [15, 1], [24, 1], [119, 1]]) {
      const items = inspect(script, frame);
      for (const kind of ["outer", "inner"]) expect(capture(items, kind).props.scale).toBe(captureScale);
      const fade = sceneOpacity(frame, 120, false);
      expect(copy(items, "1398×2034")?.opacity).toBe((1 - innerLabel) * fade);
      expect(copy(items, "2007×2853")?.opacity).toBe(innerLabel * fade);
      expect(Boolean(copy(items, "Inner: 2007×2853"))).toBe(frame >= 24);
    }
  });
  it("uses crop label timing independently of capture opacity at every reframe frame", () => {
    const script = single(validateScript(v2).scenes[2]);
    for (let frame = 0; frame < 150; frame++) {
      const items = inspect(script, frame);
      const weights = reframeDimensions(frame, 150);
      for (const [kind, dims] of [["classic", "1206×2622"], ["outer", "1398×2034"], ["inner", "2007×2853"]] as const) {
        expect(copy(items, dims)?.opacity).toBe(weights[kind] * sceneOpacity(frame, 150, false));
      }
    }
    expect(capture(inspect(script, 0), "classic").props.scale).toBe(captureScale);
    expect(capture(inspect(script, 149), "inner").props.scale).toBe(captureScale);
  });
  it("shows the outer dimension in v2-real at 10 seconds, as soon as the crop is complete", () => {
    const items = inspect(validateScript(v2), 300);
    expect(copy(items, "1206×2622")?.opacity).toBe(0);
    expect(copy(items, "1398×2034")?.opacity).toBe(1);
    expect(copy(items, "2007×2853")?.opacity).toBe(0);
  });
  it.each(["side-by-side", "before-after"] as const)("shares the scale and shows both dimensions in %s", (type) => {
    const script = single(type === "side-by-side"
      ? { type, durationSec: 4, outer: "harbor:en:1:outer", inner: "harbor:en:1:inner" }
      : { type, durationSec: 4, before: "harbor:en:1:outer", after: "harbor:en:1:inner" });
    const items = inspect(script, 20);
    expect(capture(items, "outer").props.scale).toBe(capture(items, "inner").props.scale);
    expect(copy(items, "1398×2034")?.props.data).toBe(true);
    expect(copy(items, "2007×2853")?.props.data).toBe(true);
  });
  it("gives the second ZIP group and every Text its own clock", () => {
    const script = single({ type: "zip", durationSec: 4, files: Array.from({ length: 8 }, (_, i) => ({ name: `shot-${i}.png`, format: "png" })) });
    const items = inspect(script, 61);
    expect(copy(items, "shot-0.png")).toBeUndefined();
    const filename = copy(items, "shot-4.png")!;
    expect(filename.frame).toBe(1);
    expect(filename.duration).toBe(60);
    for (const item of items.filter((item) => item.tag === "copy")) {
      expect(item.frame).toBe(1); expect(item.duration).toBe(60);
    }
  });
});
