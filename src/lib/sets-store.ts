import type { CropTransforms, FitMode, Orientation, RenderOptions } from "./specs";

import type { DuoSelection } from "./duo-selection";

export type SetMeta = {
  duoSelection?: DuoSelection;
  id: string;
  /** Server app row this set syncs its name, client and orientation to. */
  appId?: string;
  /** Set label in the picker ("Composition 01"). */
  name: string;
  /** App name used for the export folder and ZIP. Older drafts lack it and fall back to `name`. */
  appName?: string;
  clientName: string;
  orientation: Orientation;
  sameSet: boolean;
  fitMode?: FitMode;
  renderOptions?: Partial<RenderOptions>;
  include69?: boolean;
  transforms?: CropTransforms;
  lastReviewId?: string | null;
  lastReviewStatus?: string | null;
  /** Harbor example loaded from the empty state; its files are replaced, not merged, by the first import. */
  demo?: boolean;
};

const META_KEY = "duoshot.sets.v1";
const ACTIVE_KEY = "duoshot.sets.active";
const IMPORT_KEY = "duoshot.sets.import";
const WRITE_KEY = "duoshot.sets.write";
const DB_NAME = "duoshot-sets";
const STORE = "files";
type DraftScope = string;
function scopedKey(key: string, scope: DraftScope) { return scope === "legacy" ? key : `${key}:${scope}`; }


export function newSetId() {
  return crypto.randomUUID();
}

/** Use the localized template without changing names the user has already saved. */
export function nextSetName(existing: Pick<SetMeta, "name">[], template: string): string {
  const used = new Set(existing.map((set) => set.name.trim()));
  const name = (n: number) => template.replace("{n}", String(n).padStart(2, "0"));
  let n = 1;
  while (used.has(name(n))) n += 1;
  return name(n);
}

export function defaultSet(existing: Pick<SetMeta, "name">[], template: string): SetMeta {
  return {
    id: newSetId(),
    name: nextSetName(existing, template),
    appName: "",
    clientName: "",
    orientation: "portrait",
    sameSet: false,
    lastReviewId: null,
    lastReviewStatus: null,
  };
}

/** Name sent to the renderer and the apps table. */
export function appNameOf(set: Pick<SetMeta, "name" | "appName"> | undefined): string {
  if (!set) return "App";
  return (set.appName !== undefined ? set.appName.trim() : set.name.trim()) || "App";
}

export function loadSetMetas(scope: DraftScope = "guest"): SetMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(scopedKey(META_KEY, scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SetMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSetMetas(sets: SetMeta[], scope: DraftScope = "guest") {
  window.localStorage.setItem(scopedKey(META_KEY, scope), JSON.stringify(sets));
}

export function loadActiveId(scope: DraftScope = "guest"): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(scopedKey(ACTIVE_KEY, scope));
}

export function saveActiveId(id: string, scope: DraftScope = "guest") {
  window.localStorage.setItem(scopedKey(ACTIVE_KEY, scope), id);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

type StoredFile = { name: string; type: string; buffer: ArrayBuffer };
const fileWrites = new Map<string, Promise<void>>();
const draftChanges = new Map<DraftScope, Set<Promise<unknown>>>();

async function withDraftLock<T>(scope: DraftScope, kind: "changes" | "files", mode: LockMode, action: () => Promise<T>): Promise<T> {
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(`duoshot:${kind}:${scope}`, { mode }, action)
    : Promise.resolve().then(action);
}

/** Include async validation that runs before a file write is ready to be registered. */
export function trackDraftChange<T>(scope: DraftScope, change: () => Promise<T>): Promise<T> {
  const changes = draftChanges.get(scope) ?? new Set<Promise<unknown>>();
  draftChanges.set(scope, changes);
  const pending = withDraftLock(scope, "changes", "shared", change).finally(() => { changes.delete(pending); });
  changes.add(pending);
  return pending;
}

export function saveSetFiles(setId: string, side: "outer" | "inner", files: File[], scope: DraftScope = "guest") {
  const key = scopedKey(`${setId}:${side}`, scope);
  // Register before reading the files: a login can happen while arrayBuffer is still pending.
  const previous = fileWrites.get(key) ?? Promise.resolve();
  // Request the lock before serialization or waiting for another save. Other tabs' migrations
  // must wait for this write too, even when it was started without awaiting persistence.
  const write = withDraftLock(scope, "files", "exclusive", async () => {
    await previous.catch(() => {});
    // Locks release on failure as well as success. Keep a durable marker so another tab
    // (or a reload) cannot migrate stale files after serialization or IndexedDB fails.
    // Serialize writes across tabs so a successful save cannot clear another pending save.
    const pendingKey = `${WRITE_KEY}:${key}`;
    window.localStorage.setItem(pendingKey, "pending");
    await writeSetFiles(key, files);
    window.localStorage.removeItem(pendingKey);
  });
  fileWrites.set(key, write);
  return write;
}

async function writeSetFiles(key: string, files: File[]) {
  const stored: StoredFile[] = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      buffer: await file.arrayBuffer(),
    })),
  );
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(stored, key);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSetFiles(setId: string, side: "outer" | "inner", scope: DraftScope = "guest"): Promise<File[]> {
  const db = await openDb();
  const stored = await new Promise<StoredFile[] | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(scopedKey(`${setId}:${side}`, scope));
    request.onsuccess = () => resolve(request.result as StoredFile[] | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!stored) return [];
  return stored.map((item) => new File([item.buffer], item.name, { type: item.type }));
}

export async function deleteSetFiles(setId: string, scope: DraftScope = "guest") {
  // Validation can queue a save after deletion is requested. Drain it before taking
  // exclusive locks, so a validating edit can finish its own awaited file writes.
  // Failed edits must not prevent the user from deleting the draft.
  while (draftChanges.get(scope)?.size) await Promise.allSettled(draftChanges.get(scope)!);
  const keys = ["outer", "inner"].map((side) => scopedKey(`${setId}:${side}`, scope));
  await Promise.allSettled(keys.map((key) => fileWrites.get(key)));
  // Use the same lock order as migration. Pending saves from other tabs finish
  // before the transaction, instead of recreating the deleted files afterwards.
  await withDraftLock(scope, "changes", "exclusive", () => withDraftLock(scope, "files", "exclusive", async () => {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        for (const key of keys) tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
      // A failed prior save may have left a migration marker. It is no longer
      // relevant once both sides have been successfully deleted.
      try {
        for (const key of keys) window.localStorage.removeItem(`${WRITE_KEY}:${key}`);
      } catch { /* The files are already deleted; marker cleanup must not report a failed deletion. */ }
    } finally {
      db.close();
    }
  }));
}

// Every operation captures its owner. An auth change cannot redirect an in-flight write.
export function createSetStore(scope: DraftScope, onError?: () => void) {
  const guarded = (write: () => void) => { try { write(); } catch { onError?.(); } };
  return {
    loadSetMetas: () => loadSetMetas(scope),
    saveSetMetas: (sets: SetMeta[]) => guarded(() => saveSetMetas(sets, scope)),
    loadActiveId: () => loadActiveId(scope),
    saveActiveId: (id: string) => guarded(() => saveActiveId(id, scope)),
    loadSetFiles: (id: string, side: "outer" | "inner") => loadSetFiles(id, side, scope),
    saveSetFiles: (id: string, side: "outer" | "inner", files: File[]) => saveSetFiles(id, side, files, scope).catch((error) => { onError?.(); throw error; }),
    deleteSetFiles: (id: string) => deleteSetFiles(id, scope),
  };
}

type ImportSource = "guest" | "legacy";
type ImportClaims = Record<string, { owner: string; id: string }>;
const draftImports = new Map<string, Promise<number>>();
const importQueues = new Map<ImportSource, Promise<unknown>>();

export function importLocalDrafts(source: ImportSource, owner: string): Promise<number> {
  if (source === owner) return Promise.resolve(0);
  const key = `${source}:${owner}`;
  const running = draftImports.get(key);
  if (running) return running;
  const pending = (importQueues.get(source) ?? Promise.resolve()).catch(() => {}).then(async () => {
    // Drain this tab before locking, including failures that must keep originals recoverable.
    // Awaiting newly queued edits inside an exclusive lock would deadlock their shared locks.
    while (draftChanges.get(source)?.size) await Promise.all(draftChanges.get(source)!);
    await Promise.all(loadSetMetas(source).flatMap((set) => ["outer", "inner"].map((side) => fileWrites.get(scopedKey(`${set.id}:${side}`, source)))));
    // Lock validation first, then persistence. A validating edit can await file writes without
    // deadlocking, and its fire-and-forget saves are queued before we acquire the files lock.
    return withDraftLock(source, "changes", "exclusive", () =>
      withDraftLock(source, "files", "exclusive", () => importDrafts(source, owner)),
    );
  }).finally(() => { draftImports.delete(key); });
  draftImports.set(key, pending);
  importQueues.set(source, pending);
  return pending;
}

async function importDrafts(source: ImportSource, owner: string): Promise<number> {
  const claimKey = scopedKey(IMPORT_KEY, source);
  const claims = JSON.parse(window.localStorage.getItem(claimKey) ?? "{}") as ImportClaims;
  const originals = loadSetMetas(source).filter((set) => !claims[set.id] || claims[set.id].owner === owner);
  if (!originals.length) return 0;
  for (const original of originals) {
    for (const side of ["outer", "inner"] as const) {
      if (window.localStorage.getItem(`${WRITE_KEY}:${scopedKey(`${original.id}:${side}`, source)}`)) {
        throw new Error("DRAFT_SAVE_INCOMPLETE");
      }
    }
  }
  // Persist stable destination IDs and ownership before copying anything. A retry (even after
  // reloading or switching accounts) cannot duplicate or claim another account's drafts.
  for (const original of originals) claims[original.id] ??= { owner, id: newSetId() };
  window.localStorage.setItem(claimKey, JSON.stringify(claims));
  const existing = loadSetMetas(owner);
  const imported: SetMeta[] = [];
  for (const original of originals) {
    const id = claims[original.id].id;
    if (existing.some((set) => set.id === id)) continue;
    const copy = { ...original, id, appId: undefined, lastReviewId: null, lastReviewStatus: null };
    for (const side of ["outer", "inner"] as const) {
      await saveSetFiles(copy.id, side, await loadSetFiles(original.id, side, source), owner);
    }
    imported.push(copy);
  }
  // Publish only after every file is stored. Originals stay recoverable on any failure,
  // including localStorage quota errors after publication but before source cleanup.
  saveSetMetas([...loadSetMetas(owner), ...imported], owner);
  const active = originals.find((set) => set.id === loadActiveId(source)) ?? originals[0];
  saveActiveId(claims[active.id].id, owner);
  const transferred = new Set(originals.map((set) => set.id));
  saveSetMetas(loadSetMetas(source).filter((set) => !transferred.has(set.id)), source);
  // Stale claims are harmless once their source metadata is gone.
  try {
    for (const id of transferred) delete claims[id];
    window.localStorage.setItem(claimKey, JSON.stringify(claims));
  } catch { /* Source cleanup already succeeded. */ }
  return originals.length;
}
