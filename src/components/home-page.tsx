import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { FAQ, t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DuoDevice } from "@/components/duo-device";
import { LandingMotion } from "@/components/landing-motion";
import { AiGap } from "@/components/ai-gap";
import { PricingSection } from "@/components/pricing-section";
import { TrustLine } from "@/components/trust-line";
import { localePrefix, reviewPath } from "@/lib/site";
import { DEMO_REVIEW_ID, EXAMPLE_ZIP_TREE } from "@/lib/pipeline/harbor";

export function HomePage({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  const faq = FAQ[locale];
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/" />
      <LandingMotion>
        <main id="main">
          <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-8 md:py-12 lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="ds-label mb-4">{t(locale, "hero_audience")}</p>
              <h1 className="font-display max-w-xl text-5xl leading-[0.96] tracking-tight md:text-6xl">
                {t(locale, "hero_title")}
              </h1>
              <p className="mt-6 max-w-lg text-xl leading-snug">{t(locale, "pitch")}</p>
              <p className="mt-4 max-w-md text-[var(--muted)]">{t(locale, "hero_lead")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`${prefix}/tool`} data-testid="cta-tool" className="ds-cta">
                  {t(locale, "cta_tool")}
                </Link>
                <a href="/api/example-zip?v=2" data-testid="cta-example" className="ds-cta-ghost">
                  {t(locale, "cta_example")}
                </a>
              </div>
            </div>
            <DuoDevice locale={locale} />
          </section>

          <section className="mx-auto grid max-w-6xl gap-8 border-y border-[var(--line)] px-5 py-8 md:grid-cols-[1fr_1.2fr]" data-reveal>
            <div>
              <p className="ds-label">{t(locale, "zip_tree_caption")}</p>
              <ol className="zip-tree" data-testid="zip-tree">
                {EXAMPLE_ZIP_TREE.map((entry) => <li key={entry}>{entry}</li>)}
              </ol>
            </div>
            <div className="flex flex-col items-start justify-center">
              <TrustLine locale={locale} />
              <Link href={reviewPath(locale, DEMO_REVIEW_ID)} data-testid="cta-review-demo" className="ds-text-btn mt-4">
                {t(locale, "cta_review_demo")}
              </Link>
            </div>
          </section>

          <AiGap locale={locale} />

          <section className="mx-auto max-w-6xl px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "how_title")}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {[t(locale, "how_1"), t(locale, "how_2"), t(locale, "how_3")].map((item, index) => (
                <li key={item} className="border-t border-[var(--line)] pt-5">
                  <span className="font-mono text-xs tracking-[0.18em] text-[var(--muted)]">0{index + 1}</span>
                  <p className="mt-3 text-[1.05rem] leading-relaxed">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.2fr_1fr]" data-reveal>
            <div>
              <p className="ds-label">Studio</p>
              <h2 className="font-display mt-3 text-4xl">{t(locale, "studio_title")}</h2>
              <p className="mt-5 max-w-xl text-[var(--muted)]">{t(locale, "studio_lead")}</p>
              <Link href={`${prefix}/pricing#pricing`} className="ds-cta mt-7 inline-flex">{t(locale, "studio_cta")}</Link>
            </div>
            <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {["studio_point_1", "studio_point_2", "studio_point_3"].map((key, index) => (
                <li key={key} className="grid grid-cols-[2rem_1fr] gap-4 py-5">
                  <span className="font-mono text-xs text-[var(--muted)]">0{index + 1}</span>
                  <span>{t(locale, key)}</span>
                </li>
              ))}
            </ol>
          </section>

          <PricingSection locale={locale} />

          <section className="mx-auto max-w-6xl px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "faq_title")}</h2>
            <FaqList items={faq} />
          </section>
        </main>
      </LandingMotion>
      <SiteFooter locale={locale} />
    </div>
  );
}
