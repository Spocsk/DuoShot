import { SIZE_SPECS } from "../specs";
import { HARBOR_SLIDES, harborInnerSvg, harborOuterSvg, pngFromSvg } from "./harbor";
import { buildZip } from "./zip";

let cached: Buffer | null = null;

export async function buildExampleZip(): Promise<Buffer> {
  if (cached) return cached;
  const outer = SIZE_SPECS.find((spec) => spec.id === "outer-p")!;
  const inner = SIZE_SPECS.find((spec) => spec.id === "inner-p")!;
  const images = [];
  for (const [index, slide] of HARBOR_SLIDES.entries()) {
    images.push({
      spec: outer,
      index,
      buffer: await pngFromSvg(harborOuterSvg(outer.width, outer.height, slide), outer.width, outer.height),
    });
    images.push({
      spec: inner,
      index,
      buffer: await pngFromSvg(harborInnerSvg(inner.width, inner.height, slide), inner.width, inner.height),
    });
  }
  cached = await buildZip({
    appName: "ExampleApp",
    clientSlug: null,
    orientation: "portrait",
    branded: true,
    include69: false,
    format: "png",
    images,
    flattenAlpha: false,
    cloneScores: [
      { index: 0, distance: 32, label: "ok" },
      { index: 1, distance: 28, label: "ok" },
      { index: 2, distance: 30, label: "ok" },
    ],
  });
  return cached;
}
