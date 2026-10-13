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
  let failure: "open" | "error" | "abort" | null = null;
  return {
    failNextWrite(kind: typeof failure) { failure = kind; },
    open() {
      const openFailed = failure === "open";
      if (openFailed) failure = null;
      const request = {
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: openFailed ? new Error("IndexedDB open failed") : null,
        result: {
          close() {},
          transaction() {
            const writes: Array<() => void> = [];
            let writeFailure: "error" | "abort" | null = null;
            const transaction = {
              oncomplete: null as (() => void) | null,
              onerror: null as (() => void) | null,
              onabort: null as (() => void) | null,
              error: null as Error | null,
              objectStore: () => ({
                put(value: unknown, key: string) {
                  if (failure === "error" || failure === "abort") {
                    writeFailure = failure;
                    failure = null;
                    transaction.error = new Error("IndexedDB write failed");
                  }
                  writes.push(() => values.set(key, structuredClone(value)));
                },
                get(key: string) {
                  const read = { result: structuredClone(values.get(key)), onsuccess: null as (() => void) | null };
                  queueMicrotask(() => read.onsuccess?.());
                  return read;
                },
              }),
            };
            queueMicrotask(() => {
              if (writeFailure) {
                (writeFailure === "abort" ? transaction.onabort : transaction.onerror)?.();
                return;
              }
              writes.forEach((write) => write());
              transaction.oncomplete?.();
            });
            return transaction;
          },
        },
      };
      queueMicrotask(() => (openFailed ? request.onerror : request.onsuccess)?.());
      return request;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe("draft migration across browser tabs", () => {
  let importingTab: typeof import("./sets-store");
  let signingInTab: typeof import("./sets-store");
  let locks: ReturnType<typeof sharedLocks>;
  let db: ReturnType<typeof sharedFileDatabase>;
  const draft: SetMeta = { id: "guest-draft", name: "Draft", clientName: "", orientation: "portrait", sameSet: false };
  const image = (name: string) => new File([name], name, { type: "image/png" });

  beforeEach(async () => {
    const storage = new Map<string, string>();
    locks = sharedLocks();
    vi.stubGlobal("navigator", { locks });
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    } });
    db = sharedFileDatabase();
    vi.stubGlobal("indexedDB", db);
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

  it.each(["serialization", "open", "error", "abort"] as const)(
    "keeps failed %s saves recoverable across tabs and reloads until that side is saved again",
    async (failure) => {
      await importingTab.saveSetFiles(draft.id, "outer", [image("stale.png")]);
      const serialization = deferred<ArrayBuffer>();
      const updated = image("updated.png");
      const read = vi.spyOn(updated, "arrayBuffer").mockReturnValue(serialization.promise);
      const saving = Promise.allSettled([importingTab.saveSetFiles(draft.id, "outer", [updated])]);
      await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
      const migration = Promise.allSettled([signingInTab.importLocalDrafts("guest", "account-a")]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(signingInTab.loadSetMetas("account-a")).toEqual([]);

      if (failure === "serialization") serialization.reject(new Error("File read failed"));
      else {
        db.failNextWrite(failure);
        serialization.resolve(new TextEncoder().encode("updated bytes").buffer);
      }
      expect((await saving)[0].status).toBe("rejected");
      expect((await migration)[0].status).toBe("rejected");
      expect(signingInTab.loadSetMetas()).toEqual([draft]);
      expect(signingInTab.loadActiveId()).toBe(draft.id);
      expect(signingInTab.loadSetMetas("account-a")).toEqual([]);
      expect(window.localStorage.getItem("duoshot.sets.import:guest")).toBeNull();
      const stale = await signingInTab.loadSetFiles(draft.id, "outer");
      expect(stale.map((file) => file.name)).toEqual(["stale.png"]);
      expect(await stale[0].text()).toBe("stale.png");

      // No in-memory rejected promise survives this reload: the save failure must.
      vi.resetModules();
      signingInTab = await import("./sets-store");
      await expect(signingInTab.importLocalDrafts("guest", "account-a")).rejects.toThrow();
      await signingInTab.saveSetFiles(draft.id, "inner", [image("open.png")]);
      await expect(signingInTab.importLocalDrafts("guest", "account-a")).rejects.toThrow();
      expect(signingInTab.loadSetMetas()).toEqual([draft]);
      expect(signingInTab.loadSetMetas("account-a")).toEqual([]);
      expect(window.localStorage.getItem("duoshot.sets.import:guest")).toBeNull();

      await signingInTab.saveSetFiles(draft.id, "outer", [new File(["updated bytes"], "updated.png", { type: "image/png" })]);
      expect(await signingInTab.importLocalDrafts("guest", "account-a")).toBe(1);
      const [accountDraft] = signingInTab.loadSetMetas("account-a");
      const recovered = await signingInTab.loadSetFiles(accountDraft.id, "outer", "account-a");
      expect(recovered.map((file) => file.name)).toEqual(["updated.png"]);
      expect(await recovered[0].text()).toBe("updated bytes");
      expect((await signingInTab.loadSetFiles(accountDraft.id, "inner", "account-a"))[0].name).toBe("open.png");
      expect(signingInTab.loadActiveId("account-a")).toBe(accountDraft.id);
      expect(signingInTab.loadSetMetas()).toEqual([]);
      expect(await signingInTab.importLocalDrafts("guest", "account-a")).toBe(0);
      expect(signingInTab.loadSetMetas("account-a")).toHaveLength(1);
    },
  );

  it.each([true, false])("respects the final same-side save across tabs (last save succeeds: %s)", async (lastSucceeds) => {
    await importingTab.saveSetFiles(draft.id, "outer", [image("stale.png")]);
    const firstBytes = deferred<ArrayBuffer>();
    const secondBytes = deferred<ArrayBuffer>();
    const firstImage = image("first.png");
    const secondImage = image("second.png");
    const firstRead = vi.spyOn(firstImage, "arrayBuffer").mockReturnValue(firstBytes.promise);
    const secondRead = vi.spyOn(secondImage, "arrayBuffer").mockReturnValue(secondBytes.promise);
    const firstSave = Promise.allSettled([importingTab.saveSetFiles(draft.id, "outer", [firstImage])]);
    await vi.waitFor(() => expect(firstRead).toHaveBeenCalledOnce());
    const secondSave = Promise.allSettled([signingInTab.saveSetFiles(draft.id, "outer", [secondImage])]);
    vi.resetModules();
    const observingTab = await import("./sets-store");
    const migration = Promise.allSettled([observingTab.importLocalDrafts("guest", "account-a")]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (lastSucceeds) firstBytes.reject(new Error("First read failed"));
    else firstBytes.resolve(new TextEncoder().encode("first bytes").buffer);
    await vi.waitFor(() => expect(secondRead).toHaveBeenCalledOnce());
    if (lastSucceeds) secondBytes.resolve(new TextEncoder().encode("second bytes").buffer);
    else secondBytes.reject(new Error("Second read failed"));
    expect((await firstSave)[0].status).toBe(lastSucceeds ? "rejected" : "fulfilled");
    expect((await secondSave)[0].status).toBe(lastSucceeds ? "fulfilled" : "rejected");

    if (lastSucceeds) {
      expect((await migration)[0]).toEqual({ status: "fulfilled", value: 1 });
      const [accountDraft] = observingTab.loadSetMetas("account-a");
      const files = await observingTab.loadSetFiles(accountDraft.id, "outer", "account-a");
      expect(files[0].name).toBe("second.png");
      expect(await files[0].text()).toBe("second bytes");
      expect(observingTab.loadSetMetas()).toEqual([]);
    } else {
      expect((await migration)[0].status).toBe("rejected");
      expect(observingTab.loadSetMetas()).toEqual([draft]);
      expect(observingTab.loadSetMetas("account-a")).toEqual([]);
      expect(window.localStorage.getItem("duoshot.sets.import:guest")).toBeNull();
      const files = await observingTab.loadSetFiles(draft.id, "outer");
      expect(files[0].name).toBe("first.png");
      expect(await files[0].text()).toBe("first bytes");
    }
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
