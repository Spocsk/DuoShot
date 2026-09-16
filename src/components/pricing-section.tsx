import Link from "next/link";
import { t } from "@/lib/i18n";
import type { CheckoutKind } from "@/lib/plans";
import type { Locale } from "@/lib/specs";
import { DEMO_REVIEW_ID } from "@/lib/pipeline/harbor";
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
      indie: t(locale, "pricing_val_unlimited"),
      studio: t(locale, "pricing_val_unlimited"),
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
  cta: PlanCta | null;
};

function pricingPlans(locale: Locale): Record<(typeof PLAN_ORDER)[number], PlanCard> {
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
      featured: false,
      title: t(locale, "pricing_indie_title"),
      price: t(locale, "pricing_indie_price"),
      intro: t(locale, "pricing_indie_body"),
      foot: "",
      cta: { kind: "indie_monthly", label: t(locale, "pricing_indie_cta"), ghost: true },
    },
    studio: {
      featured: true,
      title: t(locale, "pricing_studio_title"),
      price: t(locale, "pricing_studio_price"),
      intro: t(locale, "pricing_studio_body"),
      foot: `${t(locale, "pricing_seats_soon")} · ${t(locale, "pricing_note")}`,
      cta: { kind: "studio_monthly", label: t(locale, "pricing_studio_cta"), ghost: true },
    },
  };
}

export function PricingSection({ locale, heading = "h2" }: { locale: Locale; heading?: "h1" | "h2" }) {
  const rows = pricingRows(locale);
  const plans = pricingPlans(locale);
  const Title = heading;
  const titleClass = heading === "h1" ? "font-display text-5xl" : "font-display text-4xl";
  return (
    <section id="pricing" data-testid="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16" data-reveal>
      <Title className={titleClass}>{t(locale, "pricing_title")}</Title>
      <p className="mt-4 max-w-xl text-[var(--muted)]">{t(locale, "pricing_lead")}</p>
      <p className="mt-4 max-w-2xl border-l border-[var(--ink)] pl-4 text-sm text-[var(--muted)]">
        {t(locale, "pricing_free_body")}
      </p>
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
                {plan.cta?.kind ? (
                  <PricingCta
                    locale={locale}
                    kind={plan.cta.kind}
                    label={plan.cta.label}
                    className={plan.cta.ghost ? "ds-cta-ghost" : "ds-cta"}
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
                  <Link href={reviewPath(locale, DEMO_REVIEW_ID)} data-testid="pricing-review-demo" className="ds-text-btn mt-3">
                    {t(locale, "cta_review_demo")}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
