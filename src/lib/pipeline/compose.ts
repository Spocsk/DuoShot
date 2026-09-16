import { mapLimit } from "../map-limit";
import { renderScreenshot } from "./process";
import { inspectSource } from "./source-inspect";
import {
  normalizeCropTransform,
  targetsFor,
  type CropTransform,
  type CropTransforms,
  type DeviceSlot,
  type PlanId,
  type RenderOptions,
  type SizeSpec,
} from "../specs";
import { compositionMetrics } from "./geometry";
import type { ZipImage } from "./zip";

const COMPOSE_CONCURRENCY = 4;

export function slotTargets(targets: SizeSpec[], slot: DeviceSlot) {
  return targets.filter((spec) => spec.slot === slot);
}

export async function composeZipImages(input: {
  outerBuffers: Buffer[];
  innerBuffers: Buffer[];
  options: RenderOptions;
  include69: boolean;
  plan: PlanId;
  transforms?: Partial<CropTransforms>;
}): Promise<{ images: ZipImage[]; flattenAlpha: boolean; compositionWarnings: string[] }> {
  const targets = targetsFor({
    orientation: input.options.orientation,
    include69: input.include69,
    plan: input.plan,
  });
  let flattenAlpha = false;
  const images: ZipImage[] = [];
  const compositionWarnings: string[] = [];

  async function renderSide(buffers: Buffer[], slot: DeviceSlot, transforms: CropTransform[] = []) {
    const specs = slotTargets(targets, slot);
    const jobs = buffers.flatMap((buffer, index) => specs.map((spec) => ({ buffer, index, spec })));
    const rendered = await mapLimit(jobs, COMPOSE_CONCURRENCY, async (job) => {
      const inspect = inspectSource(job.buffer);
      if (inspect.hasAlpha) flattenAlpha = true;
      const transform = normalizeCropTransform(transforms[job.index], input.options.fit);
      const metrics = compositionMetrics(inspect.width, inspect.height, job.spec.width, job.spec.height, transform);
      if (metrics.severity !== "ok") {
        const seq = String(job.index + 1).padStart(2, "0");
        compositionWarnings.push(
          `${job.spec.slot} ${seq}: crop ${metrics.cropPercent.toFixed(1)}%, upscale ${metrics.scale.toFixed(2)}x (${metrics.severity})`,
        );
      }
      return {
        spec: job.spec,
        index: job.index,
        buffer: await renderScreenshot(job.buffer, job.spec, input.options, transform),
      };
    });
    images.push(...rendered);
  }

  await renderSide(input.outerBuffers, "duo-outer", input.transforms?.outer);
  await renderSide(input.innerBuffers, "duo-inner", input.transforms?.inner);
  if (input.include69) {
    const phone = input.innerBuffers.length ? input.innerBuffers : input.outerBuffers;
    await renderSide(phone, "iphone-69", input.transforms?.inner?.length ? input.transforms.inner : input.transforms?.outer);
  }
  return { images, flattenAlpha, compositionWarnings };
}

export async function reviewPairJpegs(input: {
  outer: Buffer;
  inner: Buffer;
  options: RenderOptions;
  plan: PlanId;
  transforms?: { outer?: CropTransform; inner?: CropTransform };
}): Promise<{ outer: Buffer; inner: Buffer; outerSpec: SizeSpec; innerSpec: SizeSpec }> {
  const { images } = await composeZipImages({
    outerBuffers: [input.outer],
    innerBuffers: [input.inner],
    options: { ...input.options, format: "jpeg" },
    include69: false,
    plan: input.plan,
    transforms: {
      outer: input.transforms?.outer ? [input.transforms.outer] : [],
      inner: input.transforms?.inner ? [input.transforms.inner] : [],
    },
  });
  const outer = images.find((item) => item.spec.slot === "duo-outer");
  const inner = images.find((item) => item.spec.slot === "duo-inner");
  if (!outer || !inner) throw new Error("REVIEW_COMPOSE_FAILED");
  return { outer: outer.buffer, inner: inner.buffer, outerSpec: outer.spec, innerSpec: inner.spec };
}
