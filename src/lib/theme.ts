export const THEME_STORAGE_KEY = "duoshot_theme";
export type Theme = "light" | "dark" | "system";
const THEME_CHANGE = "duoshot:theme";

export function normalizeTheme(value: unknown): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

// Parser-blocking head script, permitted by the existing static-page CSP.
// System stays an attribute: CSS follows OS changes even before hydration.
export const THEME_SCRIPT = `(()=>{let t="system";try{const v=localStorage.getItem("${THEME_STORAGE_KEY}");if(v==="light"||v==="dark")t=v}catch(e){}document.documentElement.setAttribute("data-theme",t)})();`;

export function getTheme(): Theme {
  return normalizeTheme(document.documentElement.getAttribute("data-theme"));
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* Still usable when storage is blocked. */ }
  window.dispatchEvent(new Event(THEME_CHANGE));
}

export function subscribeTheme(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.setAttribute("data-theme", normalizeTheme(event.newValue));
    onChange();
  };
  window.addEventListener(THEME_CHANGE, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
