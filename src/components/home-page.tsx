import Link from "next/link";
import { FAQ, t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DuoDevice } from "@/components/duo-device";
import { ShelfSet } from "@/components/shelf-set";
import { LandingMotion } from "@/components/landing-motion";
import { AiGap } from "@/components/ai-gap";
import { PricingSection } from "@/components/pricing-section";
import { TrustLine } from "@/components/trust-line";
import { localePrefix } from "@/lib/site";
import { DEMO_REVIEW_ID, EXAMPLE_ZIP_TREE } from "@/lib/pipeline/harbor";

export function HomePage({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  const faq = FAQ[locale];
  const rejects = [1, 2, 3, 4, 5] as const;
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/" />
      <LandingMotion>
        <main id="main">
          <section className="mx-auto grid min-h-[calc(100svh-var(--header-h))] w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <h1 className="font-display max-w-xl text-5xl leading-[0.96] tracking-tight md:text-6xl">
                {t(locale, "hero_title")}
              </h1>
              <p className="mt-6 max-w-lg text-xl leading-snug">{t(locale, "pitch")}</p>
              <p className="mt-4 max-w-md text-[var(--muted)]">{t(locale, "hero_lead")}</p>
              <p className="mt-3 max-w-md text-sm text-[var(--muted)]">{t(locale, "micro_reviewer")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`${prefix}/tool`} data-testid="cta-tool" className="ds-cta">
                  {t(locale, "cta_tool")}
                </Link>
                <a href="/api/example-zip?v=2" data-testid="cta-example" className="ds-cta-ghost">
                  {t(locale, "cta_example")}
                </a>
              </div>
              <p className="ds-label mt-8">{t(locale, "zip_tree_caption")}</p>
              <ol className="zip-tree" data-testid="zip-tree">
                {EXAMPLE_ZIP_TREE.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ol>
              <Link href={`/r/${DEMO_REVIEW_ID}`} data-testid="cta-review-demo" className="ds-text-btn mt-4">
                {t(locale, "cta_review_demo")}
              </Link>
              <div className="mt-5">
                <TrustLine locale={locale} />
              </div>
            </div>
            <DuoDevice locale={locale} />
          </section>

          <AiGap locale={locale} />

          <section className="mx-auto max-w-6xl px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "reject_title")}</h2>
            <ol className="mt-10">
              {rejects.map((n) => (
                <li key={n} className="border-t border-[var(--line)] py-6">
                  <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)]">0{n}</p>
                  <p className="mt-2 text-xl">{t(locale, `reject_${n}_title`)}</p>
                  <p className="mt-2 max-w-2xl text-[var(--muted)]">{t(locale, `reject_${n}_body`)}</p>
                </li>
              ))}
            </ol>
            <Link href={`${prefix}/tool`} className="ds-cta mt-4 inline-flex">
              {t(locale, "reject_cta")}
            </Link>
          </section>

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

          <section id="shelf" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
            <h2 className="font-display text-4xl">{t(locale, "shelf_title")}</h2>
            <p className="mt-4 max-w-xl text-[var(--muted)]">{t(locale, "shelf_lead")}</p>
            <ShelfSet locale={locale} />
          </section>

          <PricingSection locale={locale} />

          <section className="mx-auto max-w-6xl px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "faq_title")}</h2>
            <dl className="mt-8">
              {faq.map((item) => (
                <div key={item.q} className="border-t border-[var(--line)] py-6">
                  <dt className="text-lg">{item.q}</dt>
                  <dd className="mt-2 max-w-3xl text-[var(--muted)]">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </main>
      </LandingMotion>
      <SiteFooter locale={locale} />
    </div>
  );
}
