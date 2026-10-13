"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n-provider";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";

const getServerTheme = (): Theme => "system";

export function ThemeToggle({ variant = "header" }: { variant?: "header" | "menu" }) {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const labelId = useId();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (variant !== "header") return;
    const dismiss = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [variant]);

  const choices = [
    { value: "light", label: t("theme_light") },
    { value: "dark", label: t("theme_dark") },
    { value: "system", label: t("theme_system") },
  ] as const;
  const buttons = <div className="ds-theme-choices" role="group" aria-labelledby={labelId}>
    {choices.map(({ value, label }) => <button
      type="button"
      key={value}
      data-testid={`theme-${value}`}
      aria-pressed={theme === value}
      onClick={() => setTheme(value)}
    >{label}</button>)}
  </div>;

  if (variant === "menu") return <div className="ds-theme-mobile" data-testid="theme-toggle-menu">
    <span id={labelId}>{t("theme_label")}</span>
    {buttons}
  </div>;

  return <details ref={menu} className="ds-theme-menu" data-testid="theme-toggle" onKeyDown={(event) => {
    if (event.key === "Escape" && menu.current) {
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
  }}>
    <summary id={labelId}>{t("theme_label")} <span aria-hidden="true">⌄</span></summary>
    {buttons}
  </details>;
}
