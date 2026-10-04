"use client";

import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";

export const HARBOR_PAIRS = 3;
export type DemoState = "idle" | "loading" | "error";

/**
 * Harbor (fictional demo app) captures at the exact Duo sizes. The demo review media route renders them
 * server side without touching the database, so no PNG has to ship in public/.
 */
export async function fetchHarborFiles(): Promise<{ outer: File[]; inner: File[] }> {
  const side = (kind: "outer" | "inner") => Promise.all(
    Array.from({ length: HARBOR_PAIRS }, async (_, index) => {
      const response = await fetch(`/api/reviews/harbor/media?slide=${index}&side=${kind}`);
      if (!response.ok) throw new Error("DEMO_UNAVAILABLE");
      const blob = await response.blob();
      return new File([blob], `harbor-${String(index + 1).padStart(2, "0")}-${kind === "outer" ? "ferme" : "ouvert"}.jpg`, { type: "image/jpeg" });
    }),
  );
  const [outer, inner] = await Promise.all([side("outer"), side("inner")]);
  return { outer, inner };
}

/** Empty-state invitation: try the workspace with Harbor before importing anything. */
export function DemoStart({ locale, state, onLoad }: { locale: Locale; state: DemoState; onLoad: () => void }) {
  return (
    <div className="tool-demo-start" data-testid="tool-demo-start">
      <p className="tool-demo-start-title">{t(locale, "tool_empty_title")}</p>
      <p className="tool-demo-start-lead">{t(locale, "tool_empty_lead")}</p>
      <button
        type="button"
        className="tool-demo-button"
        data-testid="tool-demo"
        disabled={state === "loading"}
        aria-busy={state === "loading"}
        onClick={onLoad}
      >
        {state === "loading" ? <span className="t-shimmer" data-text={t(locale, "tool_demo_loading")}>{t(locale, "tool_demo_loading")}</span> : t(locale, "tool_demo_cta")}
      </button>
      <p className="tool-demo-hint">{t(locale, "tool_demo_hint")}</p>
      {state === "error" ? <p className="ds-warn text-sm" role="alert">{t(locale, "tool_demo_error")}</p> : null}
    </div>
  );
}
