import { mapLimit } from "../map-limit";
import { renderScreenshot } from "./process";
import { inspectSource } from "./source-inspect";
import {
  targetsFor,
  type DeviceSlot,
  type PlanId,
  type RenderOptions,
  type SizeSpec,
} from "../specs";
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
}): Promise<{ images: ZipImage[]; flattenAlpha: boolean }> {
  const targets = targetsFor({
    orientation: input.options.orientation,
    include69: input.include69,
    plan: input.plan,
  });
  let flattenAlpha = false;
  const images: ZipImage[] = [];

  async function renderSide(buffers: Buffer[], slot: DeviceSlot) {
    const specs = slotTargets(targets, slot);
    const jobs = buffers.flatMap((buffer, index) => specs.map((spec) => ({ buffer, index, spec })));
    const rendered = await mapLimit(jobs, COMPOSE_CONCURRENCY, async (job) => {
      if (inspectSource(job.buffer).hasAlpha) flattenAlpha = true;
      return {
        spec: job.spec,
        index: job.index,
        buffer: await renderScreenshot(job.buffer, job.spec, input.options),
      };
    });
    images.push(...rendered);
  }

  await renderSide(input.outerBuffers, "duo-outer");
  await renderSide(input.innerBuffers, "duo-inner");
  if (input.include69) {
    const phone = input.innerBuffers.length ? input.innerBuffers : input.outerBuffers;
    await renderSide(phone, "iphone-69");
  }
  return { images, flattenAlpha };
}

export async function reviewPairJpegs(input: {
  outer: Buffer;
  inner: Buffer;
  options: RenderOptions;
  plan: PlanId;
}): Promise<{ outer: Buffer; inner: Buffer; outerSpec: SizeSpec; innerSpec: SizeSpec }> {
  const { images } = await composeZipImages({
    outerBuffers: [input.outer],
    innerBuffers: [input.inner],
    options: { ...input.options, format: "jpeg" },
    include69: false,
    plan: input.plan,
  });
  const outer = images.find((item) => item.spec.slot === "duo-outer");
  const inner = images.find((item) => item.spec.slot === "duo-inner");
  if (!outer || !inner) throw new Error("REVIEW_COMPOSE_FAILED");
  return { outer: outer.buffer, inner: inner.buffer, outerSpec: outer.spec, innerSpec: inner.spec };
}
