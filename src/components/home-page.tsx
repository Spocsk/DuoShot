import Link from "next/link";
import { FAQ, t } from "@/lib/i18n";
import type { CheckoutKind } from "@/lib/plans";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { DuoDevice } from "@/components/duo-device";
import { ShelfSet } from "@/components/shelf-set";
import { PricingCta } from "@/components/pricing-cta";
import { LandingMotion } from "@/components/landing-motion";
import { AiGap } from "@/components/ai-gap";
import { localePrefix } from "@/lib/site";

const PLAN_ORDER = ["free", "launch", "indie", "studio"] as const;

function pricingRows(locale: Locale) {
  return [
    {
      label: t(locale, "pricing_feat_zip"),
      free: t(locale, "pricing_val_preview"),
      launch: t(locale, "pricing_val_yes"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_quota"),
      free: t(locale, "pricing_val_quota_free"),
      launch: t(locale, "pricing_val_unlimited"),
      indie: t(locale, "pricing_val_unlimited"),
      studio: t(locale, "pricing_val_unlimited"),
    },
    {
      label: t(locale, "pricing_feat_69"),
      free: t(locale, "pricing_val_no"),
      launch: t(locale, "pricing_val_yes"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_sets"),
      free: t(locale, "pricing_val_yes"),
      launch: t(locale, "pricing_val_yes"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_prefix"),
      free: t(locale, "pricing_val_no"),
      launch: t(locale, "pricing_val_yes"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_review"),
      free: t(locale, "pricing_val_no"),
      launch: t(locale, "pricing_val_no"),
      indie: t(locale, "pricing_val_no"),
      studio: t(locale, "pricing_val_yes"),
    },
  ];
}

function pricingPlans(locale: Locale) {
  return {
    free: {
      featured: false,
      title: t(locale, "pricing_free_title"),
      price: t(locale, "pricing_free_price"),
      intro: t(locale, "pricing_free_body"),
      foot: "",
      cta: null as { kind: CheckoutKind; label: string; ghost?: boolean } | null,
    },
    launch: {
      featured: true,
      title: t(locale, "pricing_launch_title"),
      price: t(locale, "pricing_launch_price"),
      intro: t(locale, "pricing_launch_badge"),
      foot: "",
      cta: { kind: "indie_launch" as const, label: t(locale, "pricing_launch_cta"), ghost: false },
    },
    indie: {
      featured: false,
      title: t(locale, "pricing_indie_title"),
      price: t(locale, "pricing_indie_price"),
      intro: t(locale, "pricing_indie_body"),
      foot: "",
      cta: { kind: "indie_monthly" as const, label: t(locale, "pricing_indie_cta"), ghost: true },
    },
    studio: {
      featured: false,
      title: t(locale, "pricing_studio_title"),
      price: t(locale, "pricing_studio_price"),
      intro: t(locale, "pricing_seats_soon"),
      foot: t(locale, "pricing_note"),
      cta: { kind: "studio_monthly" as const, label: t(locale, "pricing_studio_cta"), ghost: true },
    },
  };
}

export function HomePage({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  const faq = FAQ[locale];
  const rows = pricingRows(locale);
  const plans = pricingPlans(locale);
  const rejects = [1, 2, 3, 4, 5] as const;
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/" />
      <LandingMotion>
        <main>
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

          <section id="pricing" data-testid="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16" data-reveal>
            <h2 className="font-display text-4xl">{t(locale, "pricing_title")}</h2>
            <p className="mt-4 max-w-xl text-[var(--muted)]">{t(locale, "pricing_lead")}</p>
            <div className="pricing-grid mt-12">
              {PLAN_ORDER.map((id) => {
                const plan = plans[id];
                return (
                  <article key={id} className={`pricing-col${plan.featured ? " is-featured" : ""}`}>
                    <p className="pricing-kicker">{plan.featured ? t(locale, "pricing_featured") : "\u00a0"}</p>
                    <p className="font-display text-3xl">{plan.title}</p>
                    <p className="mt-2 text-2xl">{plan.price}</p>
                    <p className="pricing-intro">{plan.intro || "\u00a0"}</p>
                    <dl className="pricing-feats">
                      {rows.map((row) => (
                        <div key={row.label} className="pricing-feat">
                          <dt>{row.label}</dt>
                          <dd>{row[id]}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="pricing-foot">{plan.foot || "\u00a0"}</p>
                    <div className="pricing-cta-slot">
                      {plan.cta ? (
                        <PricingCta
                          locale={locale}
                          kind={plan.cta.kind}
                          label={plan.cta.label}
                          className={plan.cta.ghost ? "ds-cta-ghost" : "ds-cta"}
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
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
