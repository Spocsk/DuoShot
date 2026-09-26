type Waiter = { enter: () => void; fail: () => void };

/** Shared by export and review routes in one Node process, including separate Next bundles.
 * This bounds memory on the single-instance VPS. It is not a durable job queue.
 */
export class RenderSlots {
  private active = 0;
  private waiting: Waiter[] = [];
  constructor(private readonly capacity = 1, private readonly maxWaiting = 50, private readonly timeoutMs = 45_000) {}

  acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new Error("REQUEST_CANCELLED"));
    if (this.active < this.capacity) { this.active++; return Promise.resolve(this.releaseOnce()); }
    if (this.waiting.length >= this.maxWaiting) return Promise.reject(new Error("RENDER_BUSY"));
    return new Promise((resolve, reject) => {
      const clear = () => { clearTimeout(timer); signal?.removeEventListener("abort", waiter.fail); };
      const waiter: Waiter = {
        enter: () => { clear(); this.active++; resolve(this.releaseOnce()); },
        fail: () => {
          const index = this.waiting.indexOf(waiter);
          if (index < 0) return;
          this.waiting.splice(index, 1);
          clear();
          reject(new Error(signal?.aborted ? "REQUEST_CANCELLED" : "RENDER_BUSY"));
        },
      };
      const timer = setTimeout(waiter.fail, this.timeoutMs);
      this.waiting.push(waiter);
      signal?.addEventListener("abort", waiter.fail, { once: true });
    });
  }

  private releaseOnce() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.waiting.shift()?.enter();
    };
  }
}

const state = globalThis as typeof globalThis & { duoshotRenderSlots?: RenderSlots };
// Start conservatively on the dedicated 4 GB CX23. Enable a second render only
// after measuring peak RSS with the database and storage services running.
const capacity = process.env.RENDER_CONCURRENCY === "2" ? 2 : 1;
export const renderSlots = state.duoshotRenderSlots ??= new RenderSlots(capacity);
