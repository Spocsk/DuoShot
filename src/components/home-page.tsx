import Link from "next/link";
import { FAQ, t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DuoDevice } from "@/components/duo-device";
import { ShelfSet } from "@/components/shelf-set";
import { PricingCta } from "@/components/pricing-cta";
import { LandingMotion } from "@/components/landing-motion";
import { localePrefix } from "@/lib/site";

function pricingRows(locale: Locale) {
  return [
    {
      label: t(locale, "pricing_feat_zip"),
      free: t(locale, "pricing_val_yes"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_quota"),
      free: t(locale, "pricing_val_quota_free"),
      indie: t(locale, "pricing_val_unlimited"),
      studio: t(locale, "pricing_val_unlimited"),
    },
    {
      label: t(locale, "pricing_feat_69"),
      free: t(locale, "pricing_val_no"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_seats"),
      free: t(locale, "pricing_val_seats_1"),
      indie: t(locale, "pricing_val_seats_1"),
      studio: t(locale, "pricing_val_seats_3"),
    },
    {
      label: t(locale, "pricing_feat_prefix"),
      free: t(locale, "pricing_val_no"),
      indie: t(locale, "pricing_val_no"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_card"),
      free: t(locale, "pricing_val_card_no"),
      indie: t(locale, "pricing_val_card_stripe"),
      studio: t(locale, "pricing_val_card_stripe"),
    },
  ];
}

export function HomePage({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  const faq = FAQ[locale];
  const rows = pricingRows(locale);
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/" />
      <LandingMotion>
        <main>
          <section className="mx-auto grid min-h-[calc(100svh-var(--header-h))] w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                {t(locale, "hero_kicker")}
              </p>
              <h1 className="font-display mt-5 max-w-xl text-5xl leading-[1.05] md:text-6xl">
                {t(locale, "pitch")}
              </h1>
              <p className="mt-6 max-w-md text-lg text-[var(--muted)]">{t(locale, "hero_lead")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`${prefix}/tool`} className="ds-cta">
                  {t(locale, "cta_tool")}
                </Link>
                <Link href={`${prefix}/specs`} className="ds-cta-ghost">
                  {t(locale, "cta_specs")}
                </Link>
              </div>
            </div>
            <DuoDevice locale={locale} />
          </section>

          <section className="mx-auto max-w-6xl px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "how_title")}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {[t(locale, "how_1"), t(locale, "how_2"), t(locale, "how_3")].map((item, index) => (
                <li key={item} className="border-t border-[var(--line)] pt-5">
                  <span className="font-mono text-xs tracking-[0.18em] text-[var(--muted)]">
                    0{index + 1}
                  </span>
                  <p className="mt-3 text-[1.05rem] leading-relaxed">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="shelf" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "shelf_title")}</h2>
            <p className="mt-4 max-w-xl text-[var(--muted)]">{t(locale, "shelf_lead")}</p>
            <ShelfSet locale={locale} />
          </section>

          <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "pricing_title")}</h2>
            <p className="mt-4 max-w-xl text-[var(--muted)]">{t(locale, "pricing_lead")}</p>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              <div className="border-t border-[var(--line)] pt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {t(locale, "pricing_free_title")}
                </p>
                <p className="font-display mt-3 text-4xl">{t(locale, "pricing_free_price")}</p>
                <dl className="mt-6">
                  {rows.map((row) => (
                    <div key={row.label} className="pricing-feat">
                      <dt>{row.label}</dt>
                      <dd>{row.free}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="border-t border-[var(--foreground)] pt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {t(locale, "pricing_indie_title")}
                </p>
                <p className="font-display mt-3 text-4xl">{t(locale, "pricing_indie_price")}</p>
                <dl className="mt-6">
                  {rows.map((row) => (
                    <div key={row.label} className="pricing-feat">
                      <dt>{row.label}</dt>
                      <dd>{row.indie}</dd>
                    </div>
                  ))}
                </dl>
                <PricingCta locale={locale} kind="indie_monthly" label={t(locale, "pricing_indie_cta")} />
              </div>
              <div className="border-t border-[var(--line)] pt-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {t(locale, "pricing_studio_title")}
                </p>
                <p className="font-display mt-3 text-4xl">{t(locale, "pricing_studio_price")}</p>
                <dl className="mt-6">
                  {rows.map((row) => (
                    <div key={row.label} className="pricing-feat">
                      <dt>{row.label}</dt>
                      <dd>{row.studio}</dd>
                    </div>
                  ))}
                </dl>
                <PricingCta locale={locale} kind="studio_monthly" label={t(locale, "pricing_studio_cta")} />
                <p className="mt-3 text-xs text-[var(--muted)]">{t(locale, "pricing_note")}</p>
              </div>
            </div>
          </section>

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
