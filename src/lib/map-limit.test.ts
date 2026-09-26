import { describe, expect, it } from "vitest";
import { mapLimit } from "./map-limit";

describe("mapLimit", () => {
  it("waits for in-flight writes and stops scheduling after a failure", async () => {
    let finishWrite!: () => void;
    const started: number[] = [];
    let written = false;
    let settled = false;
    const pending = mapLimit([0, 1, 2, 3], 2, async (value) => {
      started.push(value);
      if (value === 0) throw new Error("failed");
      await new Promise<void>((resolve) => { finishWrite = resolve; });
      written = true;
    }).catch((error) => { settled = true; throw error; });
    await Promise.resolve();
    expect(settled).toBe(false);
    finishWrite();
    await expect(pending).rejects.toThrow("failed");
    expect(written).toBe(true);
    expect(started).toEqual([0, 1]);
  });
  it("preserves order with a concurrency cap", async () => {
    const seen: number[] = [];
    const out = await mapLimit([3, 1, 2], 2, async (value) => {
      seen.push(value);
      await new Promise((resolve) => setTimeout(resolve, value * 5));
      return value * 10;
    });
    expect(out).toEqual([30, 10, 20]);
    expect(seen).toHaveLength(3);
  });

  it("rejects when a worker throws", async () => {
    await expect(
      mapLimit([1, 2], 2, async (value) => {
        if (value === 2) throw new Error("PATH_FORBIDDEN");
        return value;
      }),
    ).rejects.toThrow("PATH_FORBIDDEN");
  });
});
