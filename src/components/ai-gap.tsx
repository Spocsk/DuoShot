import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";

const COLS = ["alpha", "clone", "hinge", "zip"] as const;

export function AiGap({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16" data-reveal>
      <h2 className="font-display max-w-3xl text-4xl md:text-5xl">{t(locale, "ai_title")}</h2>
      <div className="mt-12 grid gap-10 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((key) => (
          <article key={key} className="border-t border-[var(--line)] pt-5">
            <h3 className="font-display text-2xl">{t(locale, `ai_${key}_title`)}</h3>
            <p className="mt-2 text-sm leading-snug text-[var(--muted)]">{t(locale, `ai_${key}_lead`)}</p>
            <div className="compare-pair mt-5">
              <CompareShot kind={key} rejected />
              <p className="duo-caption">{t(locale, "ai_before")}</p>
              <CompareShot kind={key} />
              <p className="duo-caption">{t(locale, "ai_after")}</p>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">{t(locale, `ai_${key}_ai`)}</p>
            <p className="mt-1 text-sm">{t(locale, `ai_${key}_us`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompareShot({
  kind,
  rejected = false,
}: {
  kind: (typeof COLS)[number];
  rejected?: boolean;
}) {
  return (
    <div className={`compare-shot is-${kind} ${rejected ? "is-rejected" : "is-ok"} ${kind === "hinge" ? "is-open" : ""}`}>
      {kind === "alpha" && rejected ? <span className="compare-alpha" /> : null}
      {kind === "hinge" ? <span className={`compare-hinge ${rejected ? "is-hot" : ""}`} /> : null}
      {kind === "zip" ? (
        <>
          <p className="compare-path">{rejected ? "v3_final/" : "duo-outer-portrait/"}</p>
          <p className="compare-path-file">{rejected ? "shot.png" : "01.png"}</p>
        </>
      ) : kind === "hinge" ? (
        <>
          <div className="compare-pane">
            <p className="compare-label">Harbor</p>
            <p className="compare-metric">1.4 m</p>
          </div>
          <div className="compare-pane is-side">
            <p className="compare-label">North</p>
            <p className="compare-metric">Spots</p>
          </div>
        </>
      ) : (
        <>
          <p className="compare-label">Harbor</p>
          <p className="compare-metric">1.4 m</p>
        </>
      )}
    </div>
  );
}
