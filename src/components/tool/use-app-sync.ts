import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { appNameOf, type SetMeta } from "@/lib/sets-store";

/** Debounced POST /api/apps so a renamed app is mirrored server side once typing pauses. */
export function useAppSync(saveSetMetas: (sets: SetMeta[]) => void, setSets: Dispatch<SetStateAction<SetMeta[]>>) {
  const appSyncTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = appSyncTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const syncApp = useCallback((set: SetMeta) => {
    const timers = appSyncTimers.current;
    clearTimeout(timers.get(set.id));
    // Debounced so typing a name sends one request once the user pauses, not one per key.
    timers.set(set.id, setTimeout(async () => {
      timers.delete(set.id);
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: set.appId,
          name: appNameOf(set),
          clientName: set.clientName,
          orientation: set.orientation,
        }),
      }).catch(() => null);
      const app = response?.ok ? ((await response.json()) as { id?: string }) : null;
      if (!app?.id || app.id === set.appId) return;
      setSets((current) => {
        const next = current.map((item) => (item.id === set.id ? { ...item, appId: app.id } : item));
        saveSetMetas(next);
        return next;
      });
    }, 800));
  }, [saveSetMetas, setSets]);

  return syncApp;
}
