import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { defaultSet, nextSetName } from "./sets-store";
import type { SetMeta } from "./sets-store";

describe("set names", () => {
  it("numbers new sets Composition 01, 02…", () => {
    expect(nextSetName()).toBe("Composition 01");
    expect(nextSetName([{ name: "Composition 01" }, { name: "Harbor (exemple)" }])).toBe("Composition 02");
    expect(defaultSet([{ name: "Composition 01" }, { name: "Composition 03" }]).name).toBe("Composition 02");
  });
});

// A transactional in-memory IndexedDB surface; run the real file serialization and import code.
function fileDatabase() {
  const values = new Map<string, unknown>();
  let failWrite: string | null = null;
  let abortWrite = false;
  const indexedDB = {
    open() {
      const request = {
        onsuccess: null as (() => void) | null,
        result: {
          close() {},
          transaction() {
            const writes: Array<() => void> = [];
            const tx = {
              error: null as Error | null,
              oncomplete: null as (() => void) | null,
              onerror: null as (() => void) | null,
              onabort: null as (() => void) | null,
              objectStore: () => ({
                put(value: unknown, key: string) {
                  if (key === failWrite) tx.error = new Error("IndexedDB write failed");
                  writes.push(() => values.set(key, structuredClone(value)));
                },
                delete(key: string) { writes.push(() => values.delete(key)); },
                get(key: string) {
                  const read = { result: structuredClone(values.get(key)), onsuccess: null as (() => void) | null };
                  queueMicrotask(() => read.onsuccess?.());
                  return read;
                },
              }),
            };
            queueMicrotask(() => {
              if (tx.error) {
                if (abortWrite) tx.onabort?.();
                else tx.onerror?.();
              }
              else {
                writes.forEach((write) => write());
                tx.oncomplete?.();
              }
            });
            return tx;
          },
        },
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
  return { indexedDB, failNextWritesTo: (key: string | null, abort = false) => { failWrite = key; abortWrite = abort; } };
}

describe("local draft migration", () => {
  let store: typeof import("./sets-store");
  let storage: { getItem: Mock<(key: string) => string | null>; setItem: Mock<(key: string, value: string) => void>; removeItem: Mock<(key: string) => void> };
  let db: ReturnType<typeof fileDatabase>;
  const guestSet = (id: string): SetMeta => ({ id, name: id, clientName: "Client", orientation: "portrait", sameSet: false });
  const image = (name: string, content = name) => new File([content], name, { type: "image/png" });

  beforeEach(async () => {
    vi.resetModules();
    store = await import("./sets-store");
    const values = new Map<string, string>();
    storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
      removeItem: vi.fn((key: string) => { values.delete(key); }),
    };
    db = fileDatabase();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("indexedDB", db.indexedDB);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it("preserves every draft, file, setting and active selection alongside existing account drafts", async () => {
    const first = { ...guestSet("first"), appName: "App", orientation: "landscape" as const, include69: true, renderOptions: { fit: "contain" as const }, appId: "old-app", lastReviewId: "old-review" };
    const second = guestSet("second");
    // Even colliding source/account IDs must not overwrite an account draft.
    const existing = { ...guestSet("first"), name: "Already in the account" };
    store.saveSetMetas([first, second]);
    store.saveActiveId(second.id);
    store.saveSetMetas([existing], "account-a");
    await store.saveSetFiles(first.id, "outer", [image("closed-1.png"), image("closed-2.png")]);
    await store.saveSetFiles(first.id, "inner", [image("open.png")]);
    await store.saveSetFiles(second.id, "inner", [image("second.png")]);
    await store.saveSetFiles(existing.id, "outer", [image("account.png")], "account-a");

    expect(await store.importLocalDrafts("guest", "account-a")).toBe(2);
    const drafts = store.loadSetMetas("account-a");
    expect(drafts).toHaveLength(3);
    expect(drafts[0]).toEqual(existing);
    expect(drafts[1]).toEqual({ ...first, id: expect.any(String), appId: undefined, lastReviewId: null, lastReviewStatus: null });
    expect(drafts[1].appId).toBeUndefined();
    expect(drafts[1].id).not.toBe(first.id);
    expect(store.loadActiveId("account-a")).toBe(drafts[2].id);
    const files = await store.loadSetFiles(drafts[1].id, "outer", "account-a");
    expect(files.map((file) => file.name)).toEqual(["closed-1.png", "closed-2.png"]);
    expect(files[0].type).toBe("image/png");
    expect(await files[0].text()).toBe("closed-1.png");
    expect((await store.loadSetFiles(drafts[1].id, "inner", "account-a"))[0].name).toBe("open.png");
    expect((await store.loadSetFiles(drafts[2].id, "inner", "account-a"))[0].name).toBe("second.png");
    expect((await store.loadSetFiles(existing.id, "outer", "account-a"))[0].name).toBe("account.png");
    expect(store.loadSetMetas()).toEqual([]);
    expect(store.loadSetMetas("account-b")).toEqual([]);
    expect(await store.importLocalDrafts("guest", "account-b")).toBe(0);
  });

  it("shares concurrent migrations and makes repeated calls a no-op", async () => {
    store.saveSetMetas([guestSet("draft")]);
    const first = store.importLocalDrafts("guest", "account-a");
    const second = store.importLocalDrafts("guest", "account-a");
    expect(second).toBe(first);
    expect(await Promise.all([first, second])).toEqual([1, 1]);
    const drafts = store.loadSetMetas("account-a");
    expect(await store.importLocalDrafts("guest", "account-a")).toBe(0);
    expect(store.loadSetMetas("account-a")).toEqual(drafts);
  });

  it("serializes competing account claims", async () => {
    store.saveSetMetas([guestSet("draft")]);
    expect(await Promise.all([
      store.importLocalDrafts("guest", "account-a"),
      store.importLocalDrafts("guest", "account-b"),
    ])).toEqual([1, 0]);
    expect(store.loadSetMetas("account-a")).toHaveLength(1);
    expect(store.loadSetMetas("account-b")).toEqual([]);
  });

  it("awaits in-flight file serialization and keeps the most recent save", async () => {
    store.saveSetMetas([guestSet("draft")]);
    let finishRead!: (buffer: ArrayBuffer) => void;
    const delayed = image("old.png");
    vi.spyOn(delayed, "arrayBuffer").mockImplementation(() => new Promise((resolve) => { finishRead = resolve; }));
    const first = store.saveSetFiles("draft", "outer", [delayed]);
    const latest = store.saveSetFiles("draft", "outer", [image("latest.png")]);
    const migration = store.importLocalDrafts("guest", "account-a");
    await vi.waitFor(() => expect(finishRead).toBeTypeOf("function"));
    expect(store.loadSetMetas("account-a")).toEqual([]);
    finishRead(new ArrayBuffer(4));
    await Promise.all([first, latest, migration]);
    const [draft] = store.loadSetMetas("account-a");
    expect((await store.loadSetFiles(draft.id, "outer", "account-a"))[0].name).toBe("latest.png");
  });

  it("waits for guest validation before reading draft metadata or pending file writes", async () => {
    store.saveSetMetas([guestSet("draft")]);
    let finishValidation!: () => void;
    const validation = new Promise<void>((resolve) => { finishValidation = resolve; });
    const change = store.trackDraftChange("guest", async () => {
      await validation;
      store.saveSetMetas([{ ...guestSet("draft"), name: "Validated draft" }]);
      // The tool starts persistence without waiting for IndexedDB itself.
      void store.saveSetFiles("draft", "outer", [image("validated.png")]);
    });
    const migration = store.importLocalDrafts("guest", "account-a");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.loadSetMetas("account-a")).toEqual([]);
    expect(storage.getItem("duoshot.sets.import:guest")).toBeNull();
    finishValidation();
    await Promise.all([change, migration]);
    const [draft] = store.loadSetMetas("account-a");
    expect(draft.name).toBe("Validated draft");
    expect((await store.loadSetFiles(draft.id, "outer", "account-a"))[0].name).toBe("validated.png");
    expect(store.loadSetMetas()).toEqual([]);
  });

  it("retains guest drafts when their pending validation fails", async () => {
    store.saveSetMetas([guestSet("draft")]);
    let failValidation!: (error: Error) => void;
    const change = store.trackDraftChange("guest", () => new Promise<void>((_, reject) => { failValidation = reject; }));
    const migration = store.importLocalDrafts("guest", "account-a");
    const changed = expect(change).rejects.toThrow("Image validation failed");
    const migrated = expect(migration).rejects.toThrow("Image validation failed");
    await vi.waitFor(() => expect(failValidation).toBeTypeOf("function"));
    failValidation(new Error("Image validation failed"));
    await Promise.all([changed, migrated]);
    expect(store.loadSetMetas()).toEqual([guestSet("draft")]);
    expect(store.loadSetMetas("account-a")).toEqual([]);
    expect(storage.getItem("duoshot.sets.import:guest")).toBeNull();
  });

  it.each(["error", "abort"])("retains originals on IndexedDB %s and retries with the same destination IDs", async (failure) => {
    store.saveSetMetas([guestSet("draft")]);
    await store.saveSetFiles("draft", "outer", [image("closed.png")]);
    const setItem = storage.setItem.getMockImplementation()!;
    storage.setItem.mockImplementation((key: string, value: string) => {
      setItem(key, value);
      if (key === "duoshot.sets.import:guest") {
        const claims = JSON.parse(value);
        if (claims.draft) db.failNextWritesTo(`${claims.draft.id}:inner:account-a`, failure === "abort");
      }
    });
    await expect(store.importLocalDrafts("guest", "account-a")).rejects.toThrow("IndexedDB write failed");
    const destination = JSON.parse(storage.getItem("duoshot.sets.import:guest")!).draft.id;
    expect(store.loadSetMetas()).toEqual([guestSet("draft")]);
    expect((await store.loadSetFiles("draft", "outer"))[0].name).toBe("closed.png");
    expect(store.loadSetMetas("account-a")).toEqual([]);
    expect(await store.importLocalDrafts("guest", "account-b")).toBe(0);
    storage.setItem.mockImplementation(setItem);
    db.failNextWritesTo(null);
    expect(await store.importLocalDrafts("guest", "account-a")).toBe(1);
    expect(store.loadSetMetas("account-a").map((set) => set.id)).toEqual([destination]);
  });

  it.each(["duoshot.sets.v1:account-a", "duoshot.sets.active:account-a", "duoshot.sets.v1:guest"])(
    "recovers after a reload when localStorage fails at %s without duplicating or overwriting published files",
    async (failureKey) => {
      store.saveSetMetas([guestSet("draft")]);
      await store.saveSetFiles("draft", "outer", [image("closed.png")]);
      const setItem = storage.setItem.getMockImplementation()!;
      storage.setItem.mockImplementation((key: string, value: string) => {
        if (key === failureKey) throw new Error("Storage full");
        setItem(key, value);
      });
      await expect(store.importLocalDrafts("guest", "account-a")).rejects.toThrow("Storage full");
      expect(store.loadSetMetas()).toEqual([guestSet("draft")]);
      const beforeRetry = store.loadSetMetas("account-a");
      if (beforeRetry.length) await store.saveSetFiles(beforeRetry[0].id, "outer", [image("edited.png")], "account-a");
      storage.setItem.mockImplementation(setItem);
      vi.resetModules();
      store = await import("./sets-store");
      expect(await store.importLocalDrafts("guest", "account-a")).toBe(1);
      const [draft] = store.loadSetMetas("account-a");
      expect(store.loadSetMetas("account-a")).toHaveLength(1);
      expect(store.loadActiveId("account-a")).toBe(draft.id);
      expect((await store.loadSetFiles(draft.id, "outer", "account-a"))[0].name).toBe(beforeRetry.length ? "edited.png" : "closed.png");
      expect(store.loadSetMetas()).toEqual([]);
    },
  );

  it("does not discard a draft after a failed guest file save", async () => {
    store.saveSetMetas([guestSet("draft")]);
    db.failNextWritesTo("draft:outer:guest");
    await expect(store.saveSetFiles("draft", "outer", [image("closed.png")])).rejects.toThrow();
    await expect(store.importLocalDrafts("guest", "account-a")).rejects.toThrow();
    expect(store.loadSetMetas()).toEqual([guestSet("draft")]);
    expect(store.loadSetMetas("account-a")).toEqual([]);
  });

  it("keeps legacy recovery available without automatic guest import claiming it", async () => {
    store.saveSetMetas([guestSet("legacy-draft")], "legacy");
    await store.saveSetFiles("legacy-draft", "inner", [image("old.png")], "legacy");
    expect(await store.importLocalDrafts("guest", "account-a")).toBe(0);
    expect(await store.importLocalDrafts("legacy", "account-a")).toBe(1);
    const [draft] = store.loadSetMetas("account-a");
    expect((await store.loadSetFiles(draft.id, "inner", "account-a"))[0].name).toBe("old.png");
    expect(await store.importLocalDrafts("legacy", "account-a")).toBe(0);
  });
});
