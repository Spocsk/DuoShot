import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTheme, normalizeTheme, setTheme, subscribeTheme, THEME_SCRIPT, THEME_STORAGE_KEY } from "./theme";

afterEach(() => vi.unstubAllGlobals());

describe("theme before hydration", () => {
  it.each([null, "system", "invalid", "DARK", "", "light", "dark"])("initializes stored %s safely", (stored) => {
    const setAttribute = vi.fn();
    runInNewContext(THEME_SCRIPT, {
      localStorage: { getItem: (key: string) => { expect(key).toBe(THEME_STORAGE_KEY); return stored; } },
      document: { documentElement: { setAttribute } },
    });
    expect(setAttribute).toHaveBeenCalledExactlyOnceWith("data-theme", normalizeTheme(stored));
  });

  it("defaults to system when storage is inaccessible", () => {
    const setAttribute = vi.fn();
    runInNewContext(THEME_SCRIPT, {
      get localStorage() { throw new Error("SecurityError"); },
      document: { documentElement: { setAttribute } },
    });
    expect(setAttribute).toHaveBeenCalledExactlyOnceWith("data-theme", "system");
  });

  it("runs first in the body before the motion flag with hydration mismatch suppression and existing CSP support", async () => {
    const layout = readFileSync("src/components/document-layout.tsx", "utf8");
    expect(layout).not.toMatch(/<head\b/);
    expect(layout).toMatch(/<body\b[^>]*>\s*<script id="duoshot-theme" dangerouslySetInnerHTML=\{\{ __html: THEME_SCRIPT \}\} \/>\s*<script dangerouslySetInnerHTML=\{\{ __html: MOTION_FLAG \}\} \/>/);
    const html = layout.match(/<html\b[^>]*>/)![0];
    expect(html).not.toContain("data-theme=");
    expect(html).toContain("suppressHydrationWarning");
    const { contentSecurityPolicy } = await import("./security-headers");
    expect(contentSecurityPolicy({})).toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});

function browser() {
  let attribute = "system";
  const documentElement = {
    getAttribute: () => attribute,
    setAttribute: (_name: string, value: string) => { attribute = value; },
  };
  const window = new EventTarget();
  const localStorage = { setItem: vi.fn() };
  vi.stubGlobal("document", { documentElement });
  vi.stubGlobal("window", window);
  vi.stubGlobal("localStorage", localStorage);
  return { window, localStorage };
}

describe("theme controls", () => {
  it("updates html, persists and synchronizes multiple controls", () => {
    const { localStorage } = browser();
    const first = vi.fn(), second = vi.fn();
    const dispose = subscribeTheme(first);
    const disposeSecond = subscribeTheme(second);
    setTheme("dark");
    expect(getTheme()).toBe("dark");
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    dispose();
    disposeSecond();
    setTheme("light");
    expect(first).toHaveBeenCalledOnce();
  });

  it("works when persistence is blocked", () => {
    const { localStorage } = browser();
    localStorage.setItem.mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => setTheme("light")).not.toThrow();
    expect(getTheme()).toBe("light");
  });

  it("follows cross-tab preference changes and removal", () => {
    const { window } = browser();
    const changed = vi.fn();
    const dispose = subscribeTheme(changed);
    const storage = (key: string | null, newValue: string | null) => {
      const event = new Event("storage");
      Object.assign(event, { key, newValue });
      window.dispatchEvent(event);
    };
    storage("unrelated", "dark");
    expect(changed).not.toHaveBeenCalled();
    storage(THEME_STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
    storage(THEME_STORAGE_KEY, null);
    expect(getTheme()).toBe("system");
    setTheme("light");
    storage(null, null);
    expect(getTheme()).toBe("system");
    dispose();
  });
});

const css = readFileSync("src/app/globals.css", "utf8");
const tokens = (block: string) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
const dark = tokens(css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)![1]);
function resolve(name: string): string {
  const value = dark[name];
  return value.startsWith("var(") ? resolve(value.slice(6, -1)) : value;
}
function luminance(hex: string): number {
  const rgb = hex.slice(1).match(/../g)!.map((channel) => {
    const c = parseInt(channel, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string): number {
  const l = [luminance(resolve(a)), luminance(resolve(b))].sort((x, y) => y - x);
  return (l[0] + 0.05) / (l[1] + 0.05);
}

describe("dark palette", () => {
  it("covers every root color with identical explicit and system palettes", () => {
    const light = tokens(css.match(/:root \{([^}]+)\}/)![1]);
    for (const [name, value] of Object.entries(light)) {
      if (/^(#|rgb|var\(--studio-)/.test(value)) expect(dark, name).toHaveProperty(name);
    }
    expect(tokens(css.match(/:root:not\(\[data-theme="light"\]\) \{([^}]+)\}/)![1])).toEqual(dark);
    expect(css).toMatch(/:root\[data-theme="dark"\] \{[^}]*color-scheme: dark;/);
  });

  it.each(["studio-ink", "studio-muted", "studio-sea", "studio-link", "studio-capture-hint", "studio-capture-muted"])("%s body text meets AA on all neutral surfaces", (text) => {
    for (const bg of ["studio-canvas", "studio-surface", "studio-mist", "studio-canvas-2"]) expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["studio-warning", "studio-review-soft"], ["studio-warning-ink", "studio-warning-soft"],
    ["studio-danger", "studio-danger-soft"], ["studio-pill-ink", "studio-pill-bg"],
    ["studio-ok", "studio-ok-soft"], ["studio-sea", "studio-sea-soft"],
    ["studio-on-deep-canvas", "studio-deep"], ["studio-on-deep-surface", "studio-deep"],
    ["studio-deep-muted", "studio-deep"], ["studio-surface", "studio-cta-hover"],
  ])("%s on %s meets AA", (text, bg) => expect(contrast(text, bg)).toBeGreaterThanOrEqual(4.5));

  it("control borders have at least 3:1 contrast", () => {
    for (const bg of ["studio-canvas", "studio-surface", "studio-mist"]) expect(contrast("studio-line-strong", bg)).toBeGreaterThanOrEqual(3);
  });
});
