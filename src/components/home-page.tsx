import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { FAQ, t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DuoDevice } from "@/components/duo-device";
import { LandingMotion } from "@/components/landing-motion";
import { PricingSection } from "@/components/pricing-section";
import { TrustLine } from "@/components/trust-line";
import { localePrefix, reviewPath } from "@/lib/site";
import { DEMO_REVIEW_ID, EXAMPLE_ZIP_TREE } from "@/lib/pipeline/harbor";

export function HomePage({ locale }: { locale: Locale }) {
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
              <h1 id="studio-hero-title">
                {fr ? "Deux écrans." : "Two screens."}<br />
                <span>{fr ? "Une seule histoire." : "One story."}</span>
              </h1>
              <p>
                {fr
                  ? "Préparez vos captures iPhone Duo, vérifiez chaque détail et exportez un set prêt à déposer."
                  : "Prepare your iPhone Duo screenshots, check every detail, and export a set ready to upload."}
              </p>
              <div className="studio-hero-actions">
                <Link href={`${prefix}/tool`} data-testid="cta-tool" className="ds-cta">
                  {t(locale, "cta_tool")}
                </Link>
                <a href="#studio-story" className="studio-inline-link">
                  {fr ? "Découvrir l’atelier" : "Explore the studio"}
                  <span aria-hidden="true">↘</span>
                </a>
              </div>
            </div>
            <div className="studio-hero-object">
              <DuoDevice locale={locale} />
            </div>
            <p className="studio-hero-footnote">
              <span>{fr ? "Démo Harbor" : "Harbor demo"}</span>
              <span>{fr ? "Écran fermé / écran ouvert" : "Closed screen / open screen"}</span>
            </p>
          </section>

          <section className="studio-intro" id="studio-story" data-reveal>
            <h2>{fr ? "Les deux vues, à leur juste place." : "Both views, exactly where they belong."}</h2>
            <p>
              {fr
                ? "DuoShot réunit les captures fermé et ouvert dans un même flux de préparation, sans masquer ce qui demande votre jugement."
                : "DuoShot brings closed and open screenshots into one preparation flow, while keeping human decisions visible."}
            </p>
          </section>

          <section className="studio-sequence" aria-label={fr ? "Parcours de préparation" : "Preparation journey"}>
            <div className="studio-sequence-stage" aria-hidden="true">
              <div className="studio-sequence-device"><DuoDevice locale={locale} /></div>
              <div className="studio-sequence-inspection">
                <span className="studio-sequence-inspection-label">{fr ? "APERÇU · PAIRE 01" : "PREVIEW · PAIR 01"}</span>
                <span className="studio-sequence-inspection-line" />
                <span className="studio-sequence-inspection-detail">{fr ? "CADRAGE CONTRÔLÉ" : "FRAMING CHECKED"}</span>
              </div>
              <div className="studio-sequence-result">
                <span>{fr ? "BILAN DE LA PAIRE" : "PAIR REPORT"}</span>
                <strong>{fr ? "À vérifier ensemble" : "Ready for review"}</strong>
                <small>{fr ? "Dimensions contrôlées · cadrage à examiner" : "Dimensions checked · framing to review"}</small>
              </div>
            </div>
            <div className="studio-sequence-steps">
              <div className="studio-sequence-step" data-sequence-step>
                <span>01</span>
                <h2>{fr ? "Importez chaque état." : "Import each state."}</h2>
                <p>{fr ? "Glissez vos captures fermé et ouvert. Les paires restent alignées, de la première à la dixième." : "Drop in closed and open captures. Every pair stays aligned, from the first to the tenth."}</p>
              </div>
              <div className="studio-sequence-step" data-sequence-step>
                <span>02</span>
                <h2>{fr ? "Voyez le résultat avant l’export." : "See the result before export."}</h2>
                <p>{fr ? "Examinez les écrans sur l’appareil et au pixel près. Ajustez le cadrage, la lisibilité et la charnière." : "Inspect device and pixel previews. Adjust framing, legibility, and the hinge."}</p>
              </div>
              <div className="studio-sequence-step" data-sequence-step>
                <span>03</span>
                <h2>{fr ? "Sachez ce qui reste à vérifier." : "Know what still needs review."}</h2>
                <p>{fr ? "Le bilan sépare les contrôles techniques, les alertes visuelles et vos confirmations." : "The report separates technical checks, visual alerts, and your confirmations."}</p>
              </div>
            </div>
          </section>

          <section className="studio-delivery" data-reveal>
            <div className="studio-delivery-lead">
              <h2>{fr ? "Des fichiers prêts. Rien de flou." : "Ready files. No guesswork."}</h2>
              <p>{fr ? "Avant de télécharger, vous voyez les images finales, leur format et leurs dimensions. Le dépôt dans App Store Connect reste manuel." : "Before download, see every final image, its format, and dimensions. Upload to App Store Connect remains manual."}</p>
              <a href="/api/example-zip?v=2" data-testid="cta-example" className="studio-inline-link">
                {t(locale, "cta_example")} <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="studio-delivery-proof">
              <div className="studio-report-preview">
                <p>{fr ? "Bilan de préparation" : "Preparation report"}</p>
                <ul>
                  <li><span className="studio-check" />{fr ? "Dimensions et format contrôlés" : "Dimensions and format checked"}</li>
                  <li><span className="studio-review-dot" />{fr ? "Cadrage et similarité à examiner" : "Framing and similarity to review"}</li>
                  <li><span className="studio-human-dot" />{fr ? "App en usage à confirmer" : "App in use to confirm"}</li>
                </ul>
                <small>{fr ? "Exemple illustratif · ne prédit pas l’approbation Apple" : "Illustrative example · does not predict Apple approval"}</small>
              </div>
              <div className="studio-files-preview">
                <p>{fr ? "Dans votre ZIP" : "Inside your ZIP"}</p>
                <ol className="zip-tree" data-testid="zip-tree">
                  {EXAMPLE_ZIP_TREE.map((entry) => <li key={entry}>{entry}</li>)}
                </ol>
              </div>
            </div>
          </section>

          <section className="studio-review-invite" data-reveal>
            <div>
              <h2>{fr ? "Prêt pour le regard du client." : "Ready for your client’s eye."}</h2>
              <p>{fr ? "Avec Studio, partagez une revue temporaire et recueillez une décision sur le set, sans envoyer de fichiers à l’aveugle." : "With Studio, share a temporary review and collect a decision on the set before delivery."}</p>
              <Link href={reviewPath(locale, DEMO_REVIEW_ID)} data-testid="cta-review-demo" className="studio-inline-link">
                {t(locale, "cta_review_demo")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="studio-review-mark" aria-hidden="true"><span>H</span><span>✓</span></div>
          </section>

          <PricingSection locale={locale} />

          <section className="studio-faq" data-reveal>
            <h2>{t(locale, "faq_title")}</h2>
            <FaqList items={FAQ[locale]} />
            <TrustLine locale={locale} />
          </section>
        </main>
      </LandingMotion>
      <SiteFooter locale={locale} />
    </div>
  );
}
