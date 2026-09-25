import type { CropTransforms, FitMode, Orientation, RenderOptions } from "./specs";

export type SetMeta = {
  id: string;
  name: string;
  clientName: string;
  orientation: Orientation;
  sameSet: boolean;
  fitMode?: FitMode;
  renderOptions?: Partial<RenderOptions>;
  include69?: boolean;
  transforms?: CropTransforms;
  lastReviewId?: string | null;
  lastReviewStatus?: string | null;
};

const META_KEY = "duoshot.sets.v1";
const ACTIVE_KEY = "duoshot.sets.active";
const DB_NAME = "duoshot-sets";
const STORE = "files";
type DraftScope = string;
function scopedKey(key: string, scope: DraftScope) { return scope === "legacy" ? key : `${key}:${scope}`; }


export function newSetId() {
  return crypto.randomUUID();
}

export function defaultSet(): SetMeta {
  return {
    id: newSetId(),
    name: "App",
    clientName: "",
    orientation: "portrait",
    sameSet: false,
    lastReviewId: null,
    lastReviewStatus: null,
  };
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

export async function saveSetFiles(setId: string, side: "outer" | "inner", files: File[], scope: DraftScope = "guest") {
  const stored: StoredFile[] = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      buffer: await file.arrayBuffer(),
    })),
  );
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(stored, scopedKey(`${setId}:${side}`, scope));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
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
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(scopedKey(`${setId}:outer`, scope));
    tx.objectStore(STORE).delete(scopedKey(`${setId}:inner`, scope));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
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

export async function importLocalDrafts(source: "guest" | "legacy", owner: string): Promise<void> {
  if (source === owner) return;
  const originals = loadSetMetas(source);
  const imported: SetMeta[] = [];
  for (const original of originals) {
    const copy = { ...original, id: newSetId(), lastReviewId: null, lastReviewStatus: null };
    for (const side of ["outer", "inner"] as const) {
      await saveSetFiles(copy.id, side, await loadSetFiles(original.id, side, source), owner);
    }
    imported.push(copy);
  }
  // Publish only after every file is stored. Originals stay recoverable on any failure.
  saveSetMetas([...loadSetMetas(owner), ...imported], owner);
  if (imported[0]) saveActiveId(imported[0].id, owner);
  saveSetMetas([], source);
}
