"use client";

import { useState } from "react";
import Link from "next/link";
import { t, tf } from "@/lib/i18n";
import { ONE_TIME_CATALOG, formatEurFromCents, type CheckoutKind } from "@/lib/plans";
import type { Locale } from "@/lib/specs";
import { localePrefix, reviewPath } from "@/lib/site";
import { PricingCta } from "@/components/pricing-cta";

const PLAN_ORDER = ["trial", "indie", "studio"] as const;

function pricingRows(locale: Locale) {
  return [
    {
      label: t(locale, "pricing_feat_zip"),
      trial: t(locale, "pricing_val_quota_trial"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_quota"),
      trial: t(locale, "pricing_val_quota_trial"),
      indie: t(locale, "pricing_val_daily_quota"),
      studio: t(locale, "pricing_val_daily_quota"),
    },
    {
      label: t(locale, "pricing_feat_69"),
      trial: t(locale, "pricing_val_no"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_sets"),
      trial: t(locale, "pricing_val_yes"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_prefix"),
      trial: t(locale, "pricing_val_no"),
      indie: t(locale, "pricing_val_yes"),
      studio: t(locale, "pricing_val_yes"),
    },
    {
      label: t(locale, "pricing_feat_review"),
      trial: t(locale, "pricing_val_no"),
      indie: t(locale, "pricing_val_no"),
      studio: t(locale, "pricing_val_yes"),
    },
  ];
}

type PlanCta = {
  kind?: CheckoutKind;
  href?: string;
  label: string;
  ghost?: boolean;
  testId?: string;
};

type PlanCard = {
  featured: boolean;
  title: string;
  price: string;
  intro: string;
  foot: string;
  /** Short factual line under the foot, e.g. a current product limit. */
  note?: string;
  cta: PlanCta | null;
};

/** One-time offer shown beside the plans; priced from ONE_TIME_CATALOG only. */
function passOffer(locale: Locale) {
  const price = formatEurFromCents(ONE_TIME_CATALOG.pass30.amountCents, locale);
  return {
    kind: ONE_TIME_CATALOG.pass30.kind,
    title: t(locale, "pricing_pass_title"),
    price: tf(locale, "pricing_pass_price", { price }),
    intro: t(locale, "pricing_pass_body"),
    cta: tf(locale, "pricing_pass_cta", { price }),
  };
}

function pricingPlans(locale: Locale, yearly: boolean): Record<(typeof PLAN_ORDER)[number], PlanCard> {
  const prefix = localePrefix(locale);
  return {
    trial: {
      featured: false,
      title: t(locale, "pricing_trial_title"),
      price: t(locale, "pricing_trial_price"),
      intro: t(locale, "pricing_trial_body"),
      foot: "",
      cta: {
        href: `${prefix}/signup`,
        label: t(locale, "pricing_trial_cta"),
        ghost: true,
        testId: "pricing-cta-trial",
      },
    },
    indie: {
      featured: true,
      title: t(locale, "pricing_indie_title"),
      price: yearly ? (locale === "fr" ? "120 € / an" : "€120 / year") : t(locale, "pricing_indie_price"),
      intro: t(locale, "pricing_indie_body"),
      foot: "",
      cta: { kind: yearly ? "indie_yearly" : "indie_monthly", label: yearly ? (locale === "fr" ? "Indie — 120 €/an" : "Indie — €120/year") : t(locale, "pricing_indie_cta") },
    },
    studio: {
      featured: false,
      title: t(locale, "pricing_studio_title"),
      price: yearly ? (locale === "fr" ? "490 € / an" : "€490 / year") : t(locale, "pricing_studio_price"),
      intro: t(locale, "pricing_studio_body"),
      foot: `${t(locale, "pricing_seats_soon")} · ${t(locale, "pricing_note")}`,
      note: t(locale, "pricing_local_projects"),
      cta: { kind: yearly ? "studio_yearly" : "studio_monthly", label: yearly ? (locale === "fr" ? "Studio — 490 €/an" : "Studio — €490/year") : t(locale, "pricing_studio_cta"), ghost: true },
    },
  };
}

export function PricingSection({
  locale,
  heading = "h2",
  checkoutAvailable,
  passAvailable = false,
}: {
  locale: Locale;
  heading?: "h1" | "h2";
  /** Server-read availability so the first HTML shows the right buttons; omitted = checked after mount. */
  checkoutAvailable?: boolean;
  /** The one-time pass renders only when the server says its Stripe price is configured. */
  passAvailable?: boolean;
}) {
  const [yearly, setYearly] = useState(false);
  const rows = pricingRows(locale);
  const plans = pricingPlans(locale, yearly);
  const Title = heading;
  const titleClass = heading === "h1" ? "font-display text-5xl" : "font-display text-4xl";
  return (
    <section id="pricing" data-testid="pricing" className="studio-pricing mx-auto max-w-6xl scroll-mt-24 px-5 py-16" data-reveal>
      <Title className={titleClass}>{t(locale, "pricing_title")}</Title>
      <p className="mt-4 max-w-xl text-[var(--muted)]">{t(locale, "pricing_lead")}</p>
      <p className="mt-4 max-w-2xl border-l border-[var(--ink)] pl-4 text-sm text-[var(--muted)]">
        {t(locale, "pricing_free_body")}
      </p>
      <div className="studio-billing-switch mt-8" role="group" aria-label={locale === "fr" ? "Période de facturation" : "Billing period"}>
        <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} data-testid="billing-monthly">
          {locale === "fr" ? "Mensuel" : "Monthly"}
        </button>
        <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} data-testid="billing-yearly">
          {locale === "fr" ? "Annuel" : "Yearly"}
          <span className="studio-billing-saving">{locale === "fr" ? "2 mois offerts" : "2 months free"}</span>
        </button>
      </div>
      <div className="pricing-grid mt-12">
        {PLAN_ORDER.map((id) => {
          const plan = plans[id];
          return (
            <article key={id} className={`pricing-col${plan.featured ? " is-featured" : ""}`}>
              <p className="pricing-stamp">
                {plan.featured ? <span className="ds-pill ds-pill-ink">{t(locale, "pricing_featured")}</span> : null}
              </p>
              <p className="font-display text-3xl">{plan.title}</p>
              <p className="mt-2 text-2xl">{plan.price}</p>
              <p className="pricing-period-note">
                {yearly && id !== "trial"
                  ? id === "indie"
                    ? locale === "fr" ? "Soit 10 € / mois · 2 mois offerts" : "Equivalent to €10 / month · 2 months free"
                    : locale === "fr" ? "≈ 40,83 € / mois · 2 mois offerts" : "≈ €40.83 / month · 2 months free"
                  : "\u00a0"}
              </p>
              <p className="pricing-intro">{plan.intro || "\u00a0"}</p>
              <dl className="pricing-feats">
                {rows.map((row) => (
                  <div key={row.label} className="pricing-feat">
                    <dt>{row.label}</dt>
                    <dd>{row[id]}</dd>
                  </div>
                ))}
              </dl>
              {/* One element only: each column is a 13-track subgrid. */}
              <p className="pricing-foot">
                {plan.foot || "\u00a0"}
                {plan.note ? <span className="mt-2 block" data-testid={`pricing-note-${id}`}>{plan.note}</span> : null}
              </p>
              <div className="pricing-cta-slot">
                {plan.cta?.kind ? (
                  <PricingCta
                    locale={locale}
                    kind={plan.cta.kind}
                    label={plan.cta.label}
                    className={plan.cta.ghost ? "ds-cta-ghost" : "ds-cta"}
                    initialAvailable={checkoutAvailable}
                  />
                ) : plan.cta?.href ? (
                  <Link
                    href={plan.cta.href}
                    data-testid={plan.cta.testId}
                    className={plan.cta.ghost ? "ds-cta-ghost" : "ds-cta"}
                  >
                    {plan.cta.label}
                  </Link>
                ) : null}
                {id === "studio" ? (
                  <Link href={reviewPath(locale, "harbor")} data-testid="pricing-review-demo" className="ds-text-btn mt-3">
                    {t(locale, "cta_review_demo")}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {passAvailable ? <PassOffer locale={locale} available={checkoutAvailable} /> : null}
    </section>
  );
}

function PassOffer({ locale, available }: { locale: Locale; available?: boolean }) {
  const pass = passOffer(locale);
  return (
    <aside className="pricing-pass mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6" data-testid="pricing-pass30">
      <div className="max-w-xl">
        <p className="font-display text-2xl">
          {pass.title} <span className="text-lg text-[var(--muted)]">· {pass.price}</span>
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{pass.intro}</p>
      </div>
      <PricingCta locale={locale} kind={pass.kind} label={pass.cta} className="ds-cta-ghost" initialAvailable={available} />
    </aside>
  );
}
