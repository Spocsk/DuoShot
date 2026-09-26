import { describe, expect, it } from "vitest";
import { RenderSlots } from "./render-slots";

describe("render admission", () => {
  it("admits two operations and never releases a slot twice", async () => {
    const slots = new RenderSlots(2);
    const first = await slots.acquire();
    const second = await slots.acquire();
    let started = false;
    const third = slots.acquire().then((release) => { started = true; return release; });
    await Promise.resolve();
    expect(started).toBe(false);
    first(); first();
    const releaseThird = await third;
    expect(started).toBe(true);
    let fourthStarted = false;
    const fourth = slots.acquire().then((release) => { fourthStarted = true; return release; });
    await Promise.resolve();
    expect(fourthStarted).toBe(false);
    second(); (await fourth)(); releaseThird();
  });
  it("removes an aborted waiter without consuming a slot", async () => {
    const slots = new RenderSlots(1);
    const release = await slots.acquire();
    const abort = new AbortController();
    const rejected = expect(slots.acquire(abort.signal)).rejects.toThrow("REQUEST_CANCELLED");
    abort.abort(); await rejected;
    release(); (await slots.acquire())();
  });
  it("rejects excess traffic and expires waiting requests", async () => {
    const slots = new RenderSlots(1, 1, 5);
    const release = await slots.acquire();
    const timedOut = expect(slots.acquire()).rejects.toThrow("RENDER_BUSY");
    await expect(slots.acquire()).rejects.toThrow("RENDER_BUSY");
    await timedOut;
    release();
  });
});
