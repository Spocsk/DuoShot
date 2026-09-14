import type { Orientation } from "./specs";

export type SetMeta = {
  id: string;
  name: string;
  clientName: string;
  orientation: Orientation;
  sameSet: boolean;
};

const META_KEY = "duoshot.sets.v1";
const ACTIVE_KEY = "duoshot.sets.active";
const DB_NAME = "duoshot-sets";
const STORE = "files";

export function newSetId() {
  return crypto.randomUUID();
}

export function defaultSet(): SetMeta {
  return {
    id: newSetId(),
    name: "MyApp",
    clientName: "",
    orientation: "portrait",
    sameSet: false,
  };
}

export function loadSetMetas(): SetMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SetMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSetMetas(sets: SetMeta[]) {
  window.localStorage.setItem(META_KEY, JSON.stringify(sets));
}

export function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string) {
  window.localStorage.setItem(ACTIVE_KEY, id);
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

export async function saveSetFiles(setId: string, side: "outer" | "inner", files: File[]) {
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
    tx.objectStore(STORE).put(stored, `${setId}:${side}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadSetFiles(setId: string, side: "outer" | "inner"): Promise<File[]> {
  const db = await openDb();
  const stored = await new Promise<StoredFile[] | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(`${setId}:${side}`);
    request.onsuccess = () => resolve(request.result as StoredFile[] | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!stored) return [];
  return stored.map((item) => new File([item.buffer], item.name, { type: item.type }));
}

export async function deleteSetFiles(setId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(`${setId}:outer`);
    tx.objectStore(STORE).delete(`${setId}:inner`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
