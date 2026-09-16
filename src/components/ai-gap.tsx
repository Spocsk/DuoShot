import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";

const PORTRAIT = ["alpha", "clone", "zip"] as const;
type MomentKey = (typeof PORTRAIT)[number] | "hinge";

export function AiGap({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-16" data-reveal>
      <h2 className="font-display max-w-3xl text-4xl md:text-5xl">{t(locale, "ai_title")}</h2>
      <p className="ds-label mt-4">{t(locale, "example_listing")}</p>
      <div className="mt-8 grid gap-8 md:mt-12 md:grid-cols-2 md:gap-10 xl:grid-cols-3">
        {PORTRAIT.map((key) => (
          <Moment key={key} locale={locale} kind={key} />
        ))}
      </div>
      <Moment locale={locale} kind="hinge" wide />
    </section>
  );
}

function Moment({
  locale,
  kind,
  wide = false,
}: {
  locale: Locale;
  kind: MomentKey;
  wide?: boolean;
}) {
  return (
    <article className={wide ? "compare-hinge-block mt-10 border-t border-[var(--line)] pt-5 md:mt-14" : "border-t border-[var(--line)] pt-5"}>
      <h3 className="font-display text-2xl">{t(locale, `ai_${kind}_title`)}</h3>
      <p className={`mt-2 text-sm leading-snug text-[var(--muted)] ${wide ? "max-w-2xl" : ""}`}>
        {t(locale, `ai_${kind}_lead`)}
      </p>
      <div className={`compare-pair mt-4 md:mt-5 ${wide ? "compare-pair-hinge" : ""}`}>
        <div>
          <CompareShot kind={kind} rejected />
          <p className="duo-caption">{t(locale, "ai_before")}</p>
        </div>
        <div>
          <CompareShot kind={kind} />
          <p className="duo-caption">{t(locale, "ai_after")}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">{t(locale, `ai_${kind}_ai`)}</p>
      <p className="mt-1 text-sm">{t(locale, `ai_${kind}_us`)}</p>
    </article>
  );
}

function CompareShot({
  kind,
  rejected = false,
}: {
  kind: MomentKey;
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
      ) : kind === "hinge" && rejected ? (
        <p className="compare-fold-title">Harbor</p>
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
