import type { CSSProperties } from "react";
import Link from "next/link";
import { AppleAvailability } from "./apple-availability";
import { FaqList } from "@/components/faq-list";
import { getTranslator } from "@/lib/i18n";
import { FAQ } from "@/lib/i18n";
import { duoSpec, formatInches, type Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DuoDevice } from "@/components/duo-device";
import { LandingMotion } from "@/components/landing-motion";
import { PricingSection } from "@/components/pricing-section";
import { TrustLine } from "@/components/trust-line";
import { localePrefix, reviewPath } from "@/lib/site";
import { screenshotDimensions } from "@/lib/screenshot-copy";
import { DEMO_REVIEW_ID } from "@/lib/pipeline/harbor";
import { HarborCover, HarborInnerMain, ShelfInnerShot } from "@/components/harbor-ui";
import { exampleDeliveredFiles, formatBytes } from "@/lib/landing-delivery";

const OUTER = duoSpec("duo-outer", "portrait");
const INNER = duoSpec("duo-inner", "portrait");

/* ------------------------------------------------------------------ */
/* Avant / après: raw captures in, the delivered ZIP out.              */
/* ------------------------------------------------------------------ */

function RawCapture({ locale, kind }: { locale: Locale; kind: "outer" | "inner" }) {
  const { t } = getTranslator(locale);
  const outer = kind === "outer";
  return <figure className={`studio-raw is-${kind}`}>
    <div className="studio-raw-shot">
      {outer ? <HarborCover locale={locale} /> : <ShelfInnerShot index={0} locale={locale} />}
    </div>
    <figcaption>
      <code>{outer ? "Simulator Screenshot 09.14.12.png" : "IMG_0418.PNG"}</code>
      <span className="studio-raw-meta">{outer ? "1206 × 2622 · PNG" : "1920 × 2560 · PNG"}</span>
      <span className="studio-raw-flag">{outer
        ? t("home_size_not_accepted")
        : t("home_transparency_flatten")}</span>
    </figcaption>
  </figure>;
}

function DeliveredFiles({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const files = exampleDeliveredFiles();
  return <div className="studio-files">
    <div className="studio-files-head">
      <span>{t("home_file")}</span>
      <span>Pixels</span>
      <span>{t("home_file_weight")}</span>
    </div>
    <ol className="studio-files-list" data-testid="zip-tree">
      {files.map((file) => <li key={file.path} className={`is-${file.side}`}>
        <code><span>{file.folder}/</span>{file.name}</code>
        <span className="studio-files-px">{screenshotDimensions(file.spec)}</span>
        <span className="studio-files-kb">{file.bytes ? formatBytes(file.bytes, locale) : "—"}</span>
      </li>)}
      <li className="is-readme">
        <code><span>exampleapp/</span>README.txt</code>
        <span className="studio-files-px">{t("home_report")}</span>
        <span className="studio-files-kb">1 {t("home_kb")}</span>
      </li>
    </ol>
  </div>;
}

function ProofSection({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const prefix = localePrefix(locale);
  return <section className="studio-proof" aria-labelledby="studio-proof-title" data-reveal>
    <div className="studio-proof-lead">
      <p className="studio-eyebrow">{t("home_before_after")}</p>
      <h2 id="studio-proof-title">{t("home_both_views_exactly_where")}</h2>
      <p>{t("home_import_simulator_device_captures")}</p>
    </div>
    <div className="studio-proof-board">
      <div className="studio-proof-before">
        <p className="studio-proof-label"><b>{t("home_before")}</b>{t("home_raw_captures_example")}</p>
        <div className="studio-raw-pair">
          <RawCapture locale={locale} kind="outer" />
          <RawCapture locale={locale} kind="inner" />
        </div>
      </div>
      <div className="studio-proof-arrow" aria-hidden="true"><span>DuoShot</span></div>
      <div className="studio-proof-after">
        <p className="studio-proof-label"><b>{t("home_after")}</b>{t("home_delivered_zip_harbor_3")}</p>
        <div className="studio-final-pair" aria-hidden="true">
          <div className="studio-final is-outer"><div><HarborCover locale={locale} /></div><span>{screenshotDimensions(OUTER)}</span></div>
          <div className="studio-final is-inner"><div><ShelfInnerShot index={0} locale={locale} /></div><span>{screenshotDimensions(INNER)}</span></div>
        </div>
        <DeliveredFiles locale={locale} />
      </div>
    </div>
    <div className="studio-proof-actions">
      <a href="/api/example-zip?v=2" data-testid="cta-example" className="ds-cta-ghost">{t("cta_example")}</a>
      <Link href={`${prefix}/tool?demo=harbor`} className="studio-inline-link">
        {t("home_open_example_in_tool")} <span aria-hidden="true">↗</span>
      </Link>
      <small>{t("home_before_example_files_after")}</small>
    </div>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Scroll sequence: one distinct visual per step.                      */
/* ------------------------------------------------------------------ */

type SequencePhase = "import" | "inspect" | "report" | "prevent";

function ImportVisual({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  return <div className="studio-sequence-import studio-panel">
    <div className="studio-panel-top"><span>{t("home_screenshots")}</span><strong>Harbor</strong></div>
    <ol className="studio-import-pairs">
      {([0, 1, 2] as const).map((index) => <li key={index} className="studio-import-pair">
        <b>{String(index + 1).padStart(2, "0")}</b>
        <div className="studio-import-thumb is-outer"><HarborCover locale={locale} /></div>
        <div className="studio-import-thumb is-inner"><ShelfInnerShot index={index} locale={locale} /></div>
        <span className="studio-import-meta"><code>{String(index + 1).padStart(2, "0")}.png</code>{t("home_closed_open")}</span>
      </li>)}
    </ol>
    <div className="studio-import-status"><span>{t("home_6_files_3_aligned")}</span><strong>3 / 10</strong><i /></div>
  </div>;
}

function InspectVisual({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  return <div className="studio-sequence-analysis studio-panel">
    <div className="studio-panel-top"><span>{t("home_export_pixels_open_screen")}</span><strong>{screenshotDimensions(INNER)}</strong></div>
    <div className="studio-inspect-frame">
      <ShelfInnerShot index={1} locale={locale} />
      <div className="studio-frame-guide"><i /><i /><i /><i /></div>
      <span className="studio-hinge-band" />
    </div>
    <div className="studio-inspect-readout">
      <span><i className="studio-check" />Dimensions</span>
      <span><i className="studio-check" />{"Opaque, sRGB"}</span>
      <span><i className="studio-review-dot" />{t("home_text_near_fold")}</span>
      <span className="studio-sequence-score"><small>Score</small><strong>83 / 100</strong></span>
    </div>
  </div>;
}

function ReportVisual({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const rows = [
    { label: t("home_technical_checks"), value: "6 / 6", fill: 1, tone: "ok" },
    { label: t("home_visual_alerts_review"), value: "2", fill: 0.33, tone: "review" },
    { label: t("home_confirmations"), value: "0 / 2", fill: 0, tone: "human" },
  ];
  return <div className="studio-sequence-report studio-panel">
    <div className="studio-panel-top"><span>{t("home_preparation_report")}</span><strong>Harbor · set 01</strong></div>
    <ul className="studio-report-rows">
      {rows.map((row) => <li key={row.label} className={`is-${row.tone}`}>
        <span>{row.label}</span><strong>{row.value}</strong>
        <i style={{ "--fill": row.fill } as CSSProperties} />
      </li>)}
    </ul>
    <p className="studio-panel-note">{t("home_illustrative_example_does_not")}</p>
  </div>;
}

function PreventVisual({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const checks = ([1, 2, 3, 4] as const).map((n) => [t(`home_prevent_${n}_title`), t(`home_prevent_${n}_detail`)] as const);
  return <div className="studio-sequence-prevent studio-panel">
    <div className="studio-panel-top"><span>{t("home_before_submit")}</span><strong>4 / 4</strong></div>
    <ol className="studio-prevent-checks">
      {checks.map(([title, detail], index) => <li key={title}><b>{index + 1}</b><div>{title}<small>{detail}</small></div></li>)}
    </ol>
    <p className="studio-prevent-outcome">{t("home_fix_issues_before_submitting")}</p>
  </div>;
}

function SequenceVisual({ locale, phase }: { locale: Locale; phase: SequencePhase }) {
  if (phase === "import") return <ImportVisual locale={locale} />;
  if (phase === "inspect") return <InspectVisual locale={locale} />;
  if (phase === "report") return <ReportVisual locale={locale} />;
  return <PreventVisual locale={locale} />;
}

const PHASES: SequencePhase[] = ["import", "inspect", "report", "prevent"];

function SequenceSection({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const steps = ([1, 2, 3, 4] as const).map((n) => [t(`home_step_${n}_title`), t(`home_step_${n}_body`)] as const);
  return <section className="studio-sequence" aria-label={t("home_preparation_journey")}>
    <div className="studio-sequence-stage" aria-hidden="true">
      <div className="studio-stage-panels">
        {PHASES.map((phase) => <SequenceVisual key={phase} locale={locale} phase={phase} />)}
      </div>
      <ol className="studio-stage-progress">{PHASES.map((phase) => <li key={phase}><i /></li>)}</ol>
    </div>
    <div className="studio-sequence-steps">
      {steps.map(([title, body], index) => <div key={title} className="studio-sequence-step" data-sequence-step>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="studio-sequence-step-visual" aria-hidden="true"><SequenceVisual locale={locale} phase={PHASES[index]!} /></div>
      </div>)}
    </div>
  </section>;
}

/* ------------------------------------------------------------------ */

export function HomePage({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const prefix = localePrefix(locale);

  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/" />
      <LandingMotion>
        <main id="main">
          <section className="studio-hero" aria-labelledby="studio-hero-title">
            <div className="studio-hero-copy">
              <p className="studio-eyebrow">iPhone Duo · App{" "}Store Connect</p>
              <h1 id="studio-hero-title">
                {t("home_iphone_duo_screenshots")}{" "}
                <span>{t("home_exact_app_store_sizes")}</span>
              </h1>
              <p className="studio-hero-lead">
                {t("home_import_closed_open_captures")}
              </p>
              <div className="studio-hero-actions">
                <Link href={`${prefix}/tool`} data-testid="cta-tool" className="ds-cta">
                  {t("cta_tool")}
                </Link>
                <Link href={`${prefix}/tool?demo=harbor`} data-testid="cta-demo" className="ds-cta-ghost">
                  {t("home_see_example")}
                </Link>
              </div>
            </div>
            <div className="studio-hero-object">
              <DuoDevice locale={locale} />
              <dl className="studio-hero-dimensions" data-testid="hero-dimensions">
                <div className="is-outer">
                  <dt>{t("home_closed_screen")} · {formatInches(OUTER.inches, locale)}</dt>
                  <dd>{screenshotDimensions(OUTER)}<small> px · portrait</small></dd>
                </div>
                <div className="is-inner">
                  <dt>{t("home_open_screen")} · {formatInches(INNER.inches, locale)}</dt>
                  <dd>{screenshotDimensions(INNER)}<small> px · portrait</small></dd>
                </div>
              </dl>
              <Link href={`${prefix}/specs`} data-testid="cta-specs" className="studio-inline-link studio-hero-specs">
                {t("cta_specs")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="studio-hero-meta">
              <p className="studio-hero-footnote">{t("home_harbor_fictional_app")}</p>
              <div className="studio-availability">
                <AppleAvailability locale={locale} />
              </div>
            </div>
          </section>

          <ProofSection locale={locale} />

          <SequenceSection locale={locale} />

          <section className="studio-review-invite" data-reveal>
            <div>
              <h2>{t("home_ready_client_eye")}</h2>
              <p>{t("home_studio_share_temporary_review")}</p>
              <Link href={reviewPath(locale, DEMO_REVIEW_ID)} data-testid="cta-review-demo" className="studio-inline-link">
                {t("cta_review_demo")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="studio-review-preview" aria-label={t("home_preview_harbor_client_review")}>
              <div className="studio-review-preview-top">
                <span>{t("home_review_preview")}</span>
                <span className="studio-review-preview-status"><i />{t("home_awaiting_decision")}</span>
              </div>
              <div className="studio-review-preview-heading">
                <strong>Harbor</strong>
                <span>{t("home_set_01_closed_open")}</span>
              </div>
              <div className="studio-review-preview-pair">
                <div className="studio-review-preview-shot is-outer"><HarborCover locale={locale} /><span>{t("home_closed_screen")}</span></div>
                <div className="studio-review-preview-shot is-inner"><HarborInnerMain locale={locale} /><span>{t("home_open_screen")}</span></div>
              </div>
              <div className="studio-review-preview-decision">
                <span>{t("home_decision")}</span>
                <div><span>{t("home_approve")}</span><span>{t("home_needs_work")}</span></div>
              </div>
              <p>{t("home_temporary_link_decision_on")}</p>
            </div>
          </section>

          <PricingSection locale={locale} compact />

          <section className="studio-faq" data-reveal>
            <h2>{t("faq_title")}</h2>
            <FaqList items={FAQ[locale]} />
            <TrustLine locale={locale} />
          </section>
        </main>
      </LandingMotion>
      <SiteFooter locale={locale} />
    </div>
  );
}
