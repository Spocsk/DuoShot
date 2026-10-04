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

function RawCapture({ fr, kind }: { fr: boolean; kind: "outer" | "inner" }) {
  const outer = kind === "outer";
  const locale = fr ? "fr" : "en";
  return <figure className={`studio-raw is-${kind}`}>
    <div className="studio-raw-shot">
      {outer ? <HarborCover locale={locale} /> : <ShelfInnerShot index={0} locale={locale} />}
    </div>
    <figcaption>
      <code>{outer ? "Simulator Screenshot 09.14.12.png" : "IMG_0418.PNG"}</code>
      <span className="studio-raw-meta">{outer ? "1206 × 2622 · PNG" : "1920 × 2560 · PNG"}</span>
      <span className="studio-raw-flag">{outer
        ? (fr ? "Taille non acceptée" : "Size not accepted")
        : (fr ? "Transparence à aplatir" : "Transparency to flatten")}</span>
    </figcaption>
  </figure>;
}

function DeliveredFiles({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const files = exampleDeliveredFiles();
  return <div className="studio-files">
    <div className="studio-files-head">
      <span>{fr ? "Fichier" : "File"}</span>
      <span>Pixels</span>
      <span>{fr ? "Poids" : "Size"}</span>
    </div>
    <ol className="studio-files-list" data-testid="zip-tree">
      {files.map((file) => <li key={file.path} className={`is-${file.side}`}>
        <code><span>{file.folder}/</span>{file.name}</code>
        <span className="studio-files-px">{screenshotDimensions(file.spec)}</span>
        <span className="studio-files-kb">{file.bytes ? formatBytes(file.bytes, locale) : "—"}</span>
      </li>)}
      <li className="is-readme">
        <code><span>exampleapp/</span>README.txt</code>
        <span className="studio-files-px">{fr ? "bilan" : "report"}</span>
        <span className="studio-files-kb">1 {fr ? "Ko" : "KB"}</span>
      </li>
    </ol>
  </div>;
}

function ProofSection({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const fr = locale === "fr";
  const prefix = localePrefix(locale);
  return <section className="studio-proof" aria-labelledby="studio-proof-title" data-reveal>
    <div className="studio-proof-lead">
      <p className="studio-eyebrow">{fr ? "Avant / après" : "Before / after"}</p>
      <h2 id="studio-proof-title">{fr ? "Les deux vues, à leur juste place." : "Both views, exactly where they belong."}</h2>
      <p>{fr
        ? "Vous importez des captures de simulateur ou d’appareil, de toutes tailles. Vous récupérez un ZIP rangé par écran, aux dimensions App Store Connect, sans coque ni transparence."
        : "Import simulator or device captures of any size. Get back a ZIP sorted by screen, at App Store Connect dimensions, with no chassis and no transparency."}</p>
    </div>
    <div className="studio-proof-board">
      <div className="studio-proof-before">
        <p className="studio-proof-label"><b>{fr ? "Avant" : "Before"}</b>{fr ? "Vos captures brutes · exemple" : "Your raw captures · example"}</p>
        <div className="studio-raw-pair">
          <RawCapture fr={fr} kind="outer" />
          <RawCapture fr={fr} kind="inner" />
        </div>
      </div>
      <div className="studio-proof-arrow" aria-hidden="true"><span>DuoShot</span></div>
      <div className="studio-proof-after">
        <p className="studio-proof-label"><b>{fr ? "Après" : "After"}</b>{fr ? "Le ZIP livré · Harbor, 3 paires" : "The delivered ZIP · Harbor, 3 pairs"}</p>
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
        {fr ? "Ouvrir l’exemple dans l’outil" : "Open the example in the tool"} <span aria-hidden="true">↗</span>
      </Link>
      <small>{fr ? "Avant : fichiers d’exemple. Après : noms et dimensions issus de l’export réel, poids mesurés sur le ZIP exemple Harbor (app fictive)." : "Before: example files. After: names and dimensions from the real export, sizes measured on the Harbor example ZIP (fictional app)."}</small>
    </div>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Scroll sequence: one distinct visual per step.                      */
/* ------------------------------------------------------------------ */

type SequencePhase = "import" | "inspect" | "report" | "prevent";

function ImportVisual({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  return <div className="studio-sequence-import studio-panel">
    <div className="studio-panel-top"><span>{fr ? "Captures" : "Screenshots"}</span><strong>Harbor</strong></div>
    <ol className="studio-import-pairs">
      {([0, 1, 2] as const).map((index) => <li key={index} className="studio-import-pair">
        <b>{String(index + 1).padStart(2, "0")}</b>
        <div className="studio-import-thumb is-outer"><HarborCover locale={locale} /></div>
        <div className="studio-import-thumb is-inner"><ShelfInnerShot index={index} locale={locale} /></div>
        <span className="studio-import-meta"><code>{String(index + 1).padStart(2, "0")}.png</code>{fr ? "fermé · ouvert" : "closed · open"}</span>
      </li>)}
    </ol>
    <div className="studio-import-status"><span>{fr ? "6 fichiers · 3 paires alignées" : "6 files · 3 aligned pairs"}</span><strong>3 / 10</strong><i /></div>
  </div>;
}

function InspectVisual({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  return <div className="studio-sequence-analysis studio-panel">
    <div className="studio-panel-top"><span>{fr ? "Pixels exportés · écran ouvert" : "Export pixels · open screen"}</span><strong>{screenshotDimensions(INNER)}</strong></div>
    <div className="studio-inspect-frame">
      <ShelfInnerShot index={1} locale={locale} />
      <div className="studio-frame-guide"><i /><i /><i /><i /></div>
      <span className="studio-hinge-band" />
    </div>
    <div className="studio-inspect-readout">
      <span><i className="studio-check" />Dimensions</span>
      <span><i className="studio-check" />{fr ? "Opaque, sRGB" : "Opaque, sRGB"}</span>
      <span><i className="studio-review-dot" />{fr ? "Texte près du pli" : "Text near the fold"}</span>
      <span className="studio-sequence-score"><small>Score</small><strong>83 / 100</strong></span>
    </div>
  </div>;
}

function ReportVisual({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const rows = [
    { label: fr ? "Contrôles techniques" : "Technical checks", value: "6 / 6", fill: 1, tone: "ok" },
    { label: fr ? "Alertes visuelles à examiner" : "Visual alerts to review", value: "2", fill: 0.33, tone: "review" },
    { label: fr ? "Vos confirmations" : "Your confirmations", value: "0 / 2", fill: 0, tone: "human" },
  ];
  return <div className="studio-sequence-report studio-panel">
    <div className="studio-panel-top"><span>{fr ? "Bilan de préparation" : "Preparation report"}</span><strong>Harbor · set 01</strong></div>
    <ul className="studio-report-rows">
      {rows.map((row) => <li key={row.label} className={`is-${row.tone}`}>
        <span>{row.label}</span><strong>{row.value}</strong>
        <i style={{ "--fill": row.fill } as CSSProperties} />
      </li>)}
    </ul>
    <p className="studio-panel-note">{fr ? "Exemple illustratif · ne prédit pas la décision d’Apple" : "Illustrative example · does not predict Apple’s decision"}</p>
  </div>;
}

function PreventVisual({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const checks = fr
    ? [["Dimensions et format", "Contrôle automatique"], ["Cadrage", "Alerte à examiner"], ["Similarité des vues", "Comparaison à examiner"], ["Lisibilité près du pli", "Vérification humaine"]]
    : [["Dimensions and format", "Automatic check"], ["Framing", "Warning to review"], ["View similarity", "Comparison to review"], ["Legibility near the fold", "Human review"]];
  return <div className="studio-sequence-prevent studio-panel">
    <div className="studio-panel-top"><span>{fr ? "Avant de soumettre" : "Before you submit"}</span><strong>4 / 4</strong></div>
    <ol className="studio-prevent-checks">
      {checks.map(([title, detail], index) => <li key={title}><b>{index + 1}</b><div>{title}<small>{detail}</small></div></li>)}
    </ol>
    <p className="studio-prevent-outcome">{fr ? "Corrigez avant de soumettre. Limitez les allers-retours." : "Fix issues before submitting. Reduce back-and-forth."}</p>
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
  const fr = locale === "fr";
  const steps = fr
    ? [
      ["Importez chaque état.", "Glissez vos captures fermé et ouvert. Les paires restent alignées, de la première à la dixième."],
      ["Voyez le résultat avant l’export.", "Examinez chaque écran au pixel près. Ajustez le cadrage, la lisibilité et la charnière."],
      ["Sachez ce qui reste à vérifier.", "Le bilan sépare les contrôles techniques, les alertes visuelles et vos confirmations."],
      ["Repérez les problèmes avant Apple.", "Corriger avant la soumission peut vous éviter des allers-retours et des jours de retard."],
    ]
    : [
      ["Import each state.", "Drop in closed and open captures. Every pair stays aligned, from the first to the tenth."],
      ["See the result before export.", "Inspect every screen at pixel level. Adjust framing, legibility and the hinge."],
      ["Know what still needs review.", "The report separates technical checks, visual alerts and your confirmations."],
      ["Spot issues before Apple does.", "Fixing them before submission can save back-and-forth and days of delay."],
    ];
  return <section className="studio-sequence" aria-label={fr ? "Parcours de préparation" : "Preparation journey"}>
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
  const fr = locale === "fr";

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
                {fr ? "Captures iPhone Duo." : "iPhone Duo screenshots."}{" "}
                <span>{fr ? "Aux dimensions App Store." : "Exact App Store sizes."}</span>
              </h1>
              <p className="studio-hero-lead">
                {fr
                  ? "Importez les captures fermé et ouvert de votre app. DuoShot les cadre, les vérifie et exporte deux séries PNG ou JPEG opaques pour App Store Connect."
                  : "Import closed and open captures of your app. DuoShot frames them, checks them and exports two opaque PNG or JPEG sets for App Store Connect."}
              </p>
              <div className="studio-hero-actions">
                <Link href={`${prefix}/tool`} data-testid="cta-tool" className="ds-cta">
                  {t("cta_tool")}
                </Link>
                <Link href={`${prefix}/tool?demo=harbor`} data-testid="cta-demo" className="ds-cta-ghost">
                  {fr ? "Voir l’exemple" : "See the example"}
                </Link>
              </div>
            </div>
            <div className="studio-hero-object">
              <DuoDevice locale={locale} />
              <dl className="studio-hero-dimensions" data-testid="hero-dimensions">
                <div className="is-outer">
                  <dt>{fr ? "Écran fermé" : "Closed screen"} · {formatInches(OUTER.inches, locale)}</dt>
                  <dd>{screenshotDimensions(OUTER)}<small> px · portrait</small></dd>
                </div>
                <div className="is-inner">
                  <dt>{fr ? "Écran ouvert" : "Open screen"} · {formatInches(INNER.inches, locale)}</dt>
                  <dd>{screenshotDimensions(INNER)}<small> px · portrait</small></dd>
                </div>
              </dl>
              <Link href={`${prefix}/specs`} data-testid="cta-specs" className="studio-inline-link studio-hero-specs">
                {t("cta_specs")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="studio-hero-meta">
              <p className="studio-hero-footnote">{fr ? "Harbor · app fictive" : "Harbor · fictional app"}</p>
              <div className="studio-availability">
                <AppleAvailability locale={locale} />
              </div>
            </div>
          </section>

          <ProofSection locale={locale} />

          <SequenceSection locale={locale} />

          <section className="studio-review-invite" data-reveal>
            <div>
              <h2>{fr ? "Prêt pour le regard du client." : "Ready for your client’s eye."}</h2>
              <p>{fr ? "Avec Studio, partagez une revue temporaire et recueillez une décision sur le set, sans envoyer de fichiers à l’aveugle." : "With Studio, share a temporary review and collect a decision on the set before delivery."}</p>
              <Link href={reviewPath(locale, DEMO_REVIEW_ID)} data-testid="cta-review-demo" className="studio-inline-link">
                {t("cta_review_demo")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="studio-review-preview" aria-label={fr ? "Aperçu de la revue client Harbor" : "Preview of the Harbor client review"}>
              <div className="studio-review-preview-top">
                <span>{fr ? "Aperçu de la revue" : "Review preview"}</span>
                <span className="studio-review-preview-status"><i />{fr ? "En attente" : "Awaiting decision"}</span>
              </div>
              <div className="studio-review-preview-heading">
                <strong>Harbor</strong>
                <span>{fr ? "Set 01 · Écrans fermé et ouvert" : "Set 01 · Closed and open screens"}</span>
              </div>
              <div className="studio-review-preview-pair">
                <div className="studio-review-preview-shot is-outer"><HarborCover locale={locale} /><span>{fr ? "Écran fermé" : "Closed screen"}</span></div>
                <div className="studio-review-preview-shot is-inner"><HarborInnerMain locale={locale} /><span>{fr ? "Écran ouvert" : "Open screen"}</span></div>
              </div>
              <div className="studio-review-preview-decision">
                <span>{fr ? "Votre décision" : "Your decision"}</span>
                <div><span>{fr ? "Approuver" : "Approve"}</span><span>{fr ? "À refaire" : "Needs work"}</span></div>
              </div>
              <p>{fr ? "Lien temporaire · décision sur le set" : "Temporary link · decision on the set"}</p>
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
