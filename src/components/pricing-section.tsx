"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { i18nKeys, t } from "@/lib/i18n";
import { CHECKOUT_CATALOG, PLANS, type CheckoutKind } from "@/lib/plans";
import type { Locale } from "@/lib/specs";
import { appleUploadStatus } from "@/lib/apple-screenshot-status";
import { localePrefix, pricingPath, reviewPath } from "@/lib/site";
import { PricingCta } from "@/components/pricing-cta";
import { FaqList } from "@/components/faq-list";

/**
 * Plans are read from PLANS, so a new plan appears without touching this layout.
 * Individual plans are cards; the plan with several seats becomes the full-width team band.
 */
const PREFERRED_ORDER = ["free", "pass30", "indie", "studio"];
const RECOMMENDED = "indie";

type PlanRecord = Record<string, unknown>;
type PlanId = string;

const planRecords = PLANS as unknown as Record<PlanId, PlanRecord>;
const num = (plan: PlanRecord, key: string) => (typeof plan[key] === "number" ? (plan[key] as number) : null);
const hasKey = (key: string) => i18nKeys().fr.includes(key);
const text = (locale: Locale, key: string, fallback: string) => (hasKey(key) ? t(locale, key) : fallback);

function orderedPlans(): PlanId[] {
  const ids = Object.keys(planRecords);
  const rank = (id: string) => {
    const index = PREFERRED_ORDER.indexOf(id);
    return index === -1 ? PREFERRED_ORDER.length - 1 : index;
  };
  return ids.sort((a, b) => rank(a) - rank(b));
}

function isTeam(id: PlanId) {
  return (num(planRecords[id]!, "seats") ?? 1) > 1;
}

function eur(value: number, locale: Locale) {
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 }).format(value);
  return locale === "fr" ? `${formatted} €` : `€${formatted}`;
}

/** Checkout kinds that belong to a plan: `${id}_monthly`, `${id}_yearly`, or a one-off kind named after it. */
function kindsFor(id: PlanId): CheckoutKind[] {
  return (Object.keys(CHECKOUT_CATALOG) as CheckoutKind[]).filter((kind) => kind === id || kind.startsWith(`${id}_`));
}

type Offer = {
  price: string;
  note: string;
  cta: { kind: CheckoutKind; label: string } | { href: string; label: string; testId: string } | null;
};

function offerFor(id: PlanId, locale: Locale, yearly: boolean): Offer {
  const fr = locale === "fr";
  const plan = planRecords[id]!;
  const title = planTitle(id, locale);
  if (id === "free") {
    return {
      price: t(locale, "pricing_trial_price"),
      note: " ",
      cta: { href: `${localePrefix(locale)}/signup`, label: t(locale, "pricing_trial_cta"), testId: "pricing-cta-trial" },
    };
  }
  const monthly = num(plan, "monthlyEur");
  const annual = num(plan, "yearlyEur");
  if (monthly !== null) {
    const showYear = yearly && annual !== null;
    const value = showYear ? annual! : monthly;
    const kind = kindsFor(id).find((item) => item.endsWith(showYear ? "_yearly" : "_monthly"));
    const per = showYear ? t(locale, "pricing_per_year") : t(locale, "pricing_per_month");
    const note = showYear
      ? `≈ ${eur(Math.round((annual! / 12) * 100) / 100, locale)} ${t(locale, "pricing_per_month")} · ${fr ? "2 mois offerts" : "2 months free"}`
      : " ";
    return {
      price: `${eur(value, locale)} ${per}`,
      note,
      cta: kind ? { kind, label: `${title} — ${eur(value, locale).replace(" ", " ")}/${showYear ? (fr ? "an" : "year") : (fr ? "mois" : "month")}` } : null,
    };
  }
  // One-off plans (e.g. a pass): price straight from the checkout catalog.
  const kind = kindsFor(id)[0];
  const cents = kind ? CHECKOUT_CATALOG[kind].amountCents : null;
  return {
    price: cents !== null ? `${eur(cents / 100, locale)}` : "—",
    note: text(locale, `pricing_${id}_period`, " "),
    cta: kind ? { kind, label: cents !== null ? `${title} — ${eur(cents / 100, locale).replace(" ", " ")}` : title } : null,
  };
}

function planTitle(id: PlanId, locale: Locale) {
  if (id === "free") return t(locale, "pricing_trial_title");
  return text(locale, `pricing_${id}_title`, id.charAt(0).toUpperCase() + id.slice(1));
}

function planBody(id: PlanId, locale: Locale) {
  if (id === "free") return t(locale, "pricing_trial_body");
  return text(locale, `pricing_${id}_body`, "");
}

/** Comparison rows derived from plan fields. */
function comparisonRows(locale: Locale, ids: PlanId[]) {
  const yes = t(locale, "pricing_val_yes");
  const no = t(locale, "pricing_val_no");
  const fr = locale === "fr";
  const value = (id: PlanId, pick: (plan: PlanRecord) => string) => pick(planRecords[id]!);
  const quota = (plan: PlanRecord) => {
    const free = num(plan, "freeExports");
    const daily = num(plan, "dailyHdSets");
    if (free !== null) return `${free} ${fr ? "ZIP HD" : "HD ZIPs"}`;
    if (daily !== null) return `${daily} / ${fr ? "jour" : "day"}`;
    return "—";
  };
  const fullFormats = (plan: PlanRecord) => (plan.duoOnly === false ? yes : no);
  const rows: { label: string; pick: (plan: PlanRecord) => string }[] = [
    { label: t(locale, "pricing_feat_zip"), pick: (plan) => (num(plan, "freeExports") !== null ? quota(plan) : yes) },
    { label: t(locale, "pricing_feat_quota"), pick: quota },
    { label: t(locale, "pricing_feat_69"), pick: fullFormats },
    { label: t(locale, "pricing_feat_sets"), pick: () => yes },
    { label: t(locale, "pricing_feat_prefix"), pick: fullFormats },
    { label: fr ? "Sièges" : "Seats", pick: (plan) => String(num(plan, "seats") ?? 1) },
    { label: t(locale, "pricing_feat_review"), pick: (plan) => ((num(plan, "seats") ?? 1) > 1 ? yes : no) },
  ];
  return rows.map((row) => ({ label: row.label, cells: ids.map((id) => value(id, row.pick)) }));
}

function OfferCta({ locale, offer, featured }: { locale: Locale; offer: Offer; featured: boolean }) {
  if (!offer.cta) return null;
  const className = featured ? "ds-cta" : "ds-cta-ghost";
  if ("kind" in offer.cta) {
    return <PricingCta locale={locale} kind={offer.cta.kind} label={offer.cta.label} className={className} />;
  }
  return <Link href={offer.cta.href} data-testid={offer.cta.testId} className={className}>{offer.cta.label}</Link>;
}

export function PricingSection({
  locale,
  heading = "h2",
  compact = false,
}: {
  locale: Locale;
  heading?: "h1" | "h2";
  /** Home page: cards and reassurance only, with a link to the full comparison. */
  compact?: boolean;
}) {
  const [yearly, setYearly] = useState(false);
  const fr = locale === "fr";
  const ids = orderedPlans();
  const cards = ids.filter((id) => !isTeam(id));
  const teams = ids.filter(isTeam);
  const Title = heading;
  const faq = [
    { q: t(locale, "pricing_faq_local_q"), a: t(locale, "pricing_faq_local_a") },
    { q: t(locale, "pricing_faq_refund_q"), a: t(locale, "pricing_faq_refund_a") },
    { q: t(locale, "pricing_faq_apple_q"), a: appleUploadStatus(locale) },
  ];

  return (
    <section id="pricing" data-testid="pricing" className={`studio-pricing scroll-mt-24${compact ? " is-compact" : ""}`} data-reveal>
      <div className="studio-pricing-head">
        <div>
          <Title>{t(locale, "pricing_title")}</Title>
          <p className="studio-pricing-lead">{t(locale, "pricing_lead")}</p>
          <p className="studio-pricing-free">{t(locale, "pricing_free_body")}</p>
        </div>
        <div className="studio-billing-switch" role="group" aria-label={fr ? "Période de facturation" : "Billing period"}>
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} data-testid="billing-monthly">
            {fr ? "Mensuel" : "Monthly"}
          </button>
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} data-testid="billing-yearly">
            {fr ? "Annuel" : "Yearly"}
            <span className="studio-billing-saving">{fr ? "2 mois offerts" : "2 months free"}</span>
          </button>
        </div>
      </div>

      <div className="studio-plan-grid" style={{ "--plan-count": cards.length } as CSSProperties}>
        {cards.map((id) => {
          const offer = offerFor(id, locale, yearly);
          const featured = id === RECOMMENDED;
          return (
            <article key={id} className={`studio-plan${featured ? " is-featured" : ""}`} data-plan={id}>
              <div className="studio-plan-title">
                <h3>{planTitle(id, locale)}</h3>
                {featured ? <span className="studio-plan-badge">{t(locale, "pricing_featured")}</span> : null}
              </div>
              <p className="studio-plan-price">{offer.price}</p>
              <p className="studio-plan-note">{offer.note}</p>
              <p className="studio-plan-body">{planBody(id, locale)}</p>
              <div className="studio-plan-cta"><OfferCta locale={locale} offer={offer} featured={featured} /></div>
            </article>
          );
        })}
      </div>

      {teams.map((id) => {
        const offer = offerFor(id, locale, yearly);
        return (
          <article key={id} className="studio-plan-team" data-plan={id}>
            <div className="studio-plan-team-copy">
              <p className="studio-eyebrow">{t(locale, "pricing_team_kicker")}</p>
              <h3>{planTitle(id, locale)}</h3>
              <p className="studio-plan-body">{planBody(id, locale)}</p>
              <p className="studio-plan-seats">{t(locale, "pricing_seats_soon")}</p>
            </div>
            <div className="studio-plan-team-offer">
              <p className="studio-plan-price">{offer.price}</p>
              <p className="studio-plan-note">{offer.note}</p>
              <OfferCta locale={locale} offer={offer} featured={false} />
              <Link href={reviewPath(locale, "harbor")} data-testid="pricing-review-demo" className="studio-inline-link">
                {t(locale, "cta_review_demo")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        );
      })}

      <ul className="studio-reassurance" aria-label={fr ? "Paiement" : "Payment"}>
        <li>{t(locale, "pricing_reassurance_stripe")}</li>
        <li>{t(locale, "pricing_reassurance_cancel")}</li>
        <li>{t(locale, "pricing_reassurance_invoice")}</li>
      </ul>
      <p className="studio-pricing-note">{t(locale, "pricing_note")}</p>

      {compact ? (
        <Link href={pricingPath(locale)} className="studio-inline-link studio-pricing-more">
          {t(locale, "pricing_compare_link")} <span aria-hidden="true">↗</span>
        </Link>
      ) : (
        <>
          <div className="studio-compare">
            <h2>{t(locale, "pricing_compare_title")}</h2>
            <div className="studio-compare-scroll">
              <table>
                <caption className="sr-only">{t(locale, "pricing_compare_title")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t(locale, "pricing_compare_feature")}</th>
                    {ids.map((id) => <th key={id} scope="col" className={id === RECOMMENDED ? "is-featured" : undefined}>{planTitle(id, locale)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows(locale, ids).map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.cells.map((cell, index) => <td key={ids[index]} className={ids[index] === RECOMMENDED ? "is-featured" : undefined}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="studio-pricing-faq">
            <h2>{t(locale, "pricing_faq_title")}</h2>
            <FaqList items={faq} />
          </div>
        </>
      )}
    </section>
  );
}
