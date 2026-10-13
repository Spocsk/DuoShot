import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SetMeta } from "./sets-store";

type Mode = "shared" | "exclusive";

// Match Web Locks' FIFO ordering: shared requests may run together, but cannot
// jump over an exclusive request. Separate module instances model separate tabs.
function sharedLocks() {
  type Request = { mode: Mode; start: () => void };
  const queues = new Map<string, { active: number; exclusive: boolean; waiting: Request[] }>();
  const requested: Mode[] = [];
  function request<T>(name: string, options: { mode?: Mode } | (() => Promise<T>), callback?: () => Promise<T>): Promise<T> {
    const mode = typeof options === "function" ? "exclusive" : options.mode ?? "exclusive";
    const run = typeof options === "function" ? options : callback!;
    const queue = queues.get(name) ?? { active: 0, exclusive: false, waiting: [] };
    queues.set(name, queue);
    requested.push(mode);
    function drain() {
      while (queue.waiting.length && !queue.exclusive) {
        const next = queue.waiting[0];
        if (next.mode === "exclusive" && queue.active) return;
        queue.waiting.shift();
        queue.active += 1;
        queue.exclusive = next.mode === "exclusive";
        next.start();
      }
    }
    return new Promise<T>((resolve, reject) => {
      queue.waiting.push({ mode, start() {
        void Promise.resolve().then(run).then(resolve, reject).finally(() => {
          queue.active -= 1;
          queue.exclusive = false;
          drain();
        });
      } });
      queueMicrotask(drain);
    });
  }
  return { request, requested };
}

function sharedFileDatabase() {
  const values = new Map<string, unknown>();
  return {
    open() {
      const request = {
        onsuccess: null as (() => void) | null,
        result: {
          close() {},
          transaction() {
            const writes: Array<() => void> = [];
            const transaction = {
              oncomplete: null as (() => void) | null,
              objectStore: () => ({
                put(value: unknown, key: string) { writes.push(() => values.set(key, structuredClone(value))); },
                get(key: string) {
                  const read = { result: structuredClone(values.get(key)), onsuccess: null as (() => void) | null };
                  queueMicrotask(() => read.onsuccess?.());
                  return read;
                },
              }),
            };
            queueMicrotask(() => {
              writes.forEach((write) => write());
              transaction.oncomplete?.();
            });
            return transaction;
          },
        },
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("draft migration across browser tabs", () => {
  let importingTab: typeof import("./sets-store");
  let signingInTab: typeof import("./sets-store");
  let locks: ReturnType<typeof sharedLocks>;
  const draft: SetMeta = { id: "guest-draft", name: "Draft", clientName: "", orientation: "portrait", sameSet: false };
  const image = (name: string) => new File([name], name, { type: "image/png" });

  beforeEach(async () => {
    const storage = new Map<string, string>();
    locks = sharedLocks();
    vi.stubGlobal("navigator", { locks });
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } });
    vi.stubGlobal("indexedDB", sharedFileDatabase());
    vi.resetModules();
    importingTab = await import("./sets-store");
    vi.resetModules();
    signingInTab = await import("./sets-store");
    expect(signingInTab).not.toBe(importingTab);
    importingTab.saveSetMetas([draft]);
    importingTab.saveActiveId(draft.id);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it.each([true, false])("waits for another tab's validation and nested persistence (await save: %s)", async (awaitSave) => {
    const validation = deferred<void>();
    const serialization = deferred<ArrayBuffer>();
    const pendingImage = image("validated.png");
    const read = vi.spyOn(pendingImage, "arrayBuffer").mockReturnValue(serialization.promise);
    let saving: Promise<void> | undefined;
    const change = importingTab.trackDraftChange("guest", async () => {
      await validation.promise;
      importingTab.saveSetMetas([{ ...draft, name: "Validated draft", include69: true }]);
      saving = importingTab.saveSetFiles(draft.id, "outer", [pendingImage]);
      if (awaitSave) await saving;
    });
    const otherMigration = signingInTab.importLocalDrafts("guest", "account-a");
    // The importing tab receives the same auth notification while validation runs.
    const ownMigration = importingTab.importLocalDrafts("guest", "account-a");
    await vi.waitFor(() => expect(locks.requested).toContain("exclusive"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(signingInTab.loadSetMetas("account-a")).toEqual([]);

    validation.resolve();
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    expect(signingInTab.loadSetMetas("account-a")).toEqual([]);
    expect(signingInTab.loadSetMetas()).toHaveLength(1);
    serialization.resolve(new TextEncoder().encode("validated bytes").buffer);
    const recovered = await Promise.all([otherMigration, ownMigration]);
    await Promise.all([change, saving]);

    expect(recovered.reduce((sum, count) => sum + count, 0)).toBe(1);
    const accountDrafts = signingInTab.loadSetMetas("account-a");
    expect(accountDrafts).toHaveLength(1);
    expect(accountDrafts[0]).toMatchObject({ name: "Validated draft", include69: true });
    expect(signingInTab.loadActiveId("account-a")).toBe(accountDrafts[0].id);
    const files = await signingInTab.loadSetFiles(accountDrafts[0].id, "outer", "account-a");
    expect(files.map((file) => file.name)).toEqual(["validated.png"]);
    expect(await files[0].text()).toBe("validated bytes");
    expect(signingInTab.loadSetMetas()).toEqual([]);
  });

  it("waits for another tab's standalone serialization and queued latest save", async () => {
    const serialization = deferred<ArrayBuffer>();
    const pendingImage = image("old.png");
    const read = vi.spyOn(pendingImage, "arrayBuffer").mockReturnValue(serialization.promise);
    const firstSave = importingTab.saveSetFiles(draft.id, "outer", [pendingImage]);
    const latestSave = importingTab.saveSetFiles(draft.id, "outer", [image("latest.png")]);
    const migration = signingInTab.importLocalDrafts("guest", "account-a");
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(signingInTab.loadSetMetas("account-a")).toEqual([]);
    serialization.resolve(new ArrayBuffer(1));
    await Promise.all([firstSave, latestSave, migration]);

    const [accountDraft] = signingInTab.loadSetMetas("account-a");
    expect((await signingInTab.loadSetFiles(accountDraft.id, "outer", "account-a")).map((file) => file.name)).toEqual(["latest.png"]);
    expect(signingInTab.loadSetMetas()).toEqual([]);
  });

  it("allows only one of two tabs to claim the guest drafts for different accounts", async () => {
    await importingTab.saveSetFiles(draft.id, "inner", [image("open.png")]);
    const recovered = await Promise.all([
      importingTab.importLocalDrafts("guest", "account-a"),
      signingInTab.importLocalDrafts("guest", "account-b"),
    ]);
    expect(recovered.toSorted()).toEqual([0, 1]);
    const winner = recovered[0] === 1 ? "account-a" : "account-b";
    const loser = winner === "account-a" ? "account-b" : "account-a";
    const accountDrafts = signingInTab.loadSetMetas(winner);
    expect(accountDrafts).toHaveLength(1);
    expect(signingInTab.loadSetMetas(loser)).toEqual([]);
    expect((await signingInTab.loadSetFiles(accountDrafts[0].id, "inner", winner))[0].name).toBe("open.png");
    expect(signingInTab.loadSetMetas()).toEqual([]);
  });
});
