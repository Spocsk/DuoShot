"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import type { Translator } from "@/lib/i18n/types";
import { CHECKOUT_CATALOG, ONE_TIME_CATALOG, PLANS, type CheckoutKind, type OneTimeKind, type PurchaseKind } from "@/lib/plans";
import type { Locale } from "@/lib/specs";
import { appleUploadStatus } from "@/lib/apple-screenshot-status";
import { localePrefix, pricingPath, reviewPath } from "@/lib/site";
import { PricingCta } from "@/components/pricing-cta";
import { FaqList } from "@/components/faq-list";

/**
 * Plans are read from PLANS and one-time offers from ONE_TIME_CATALOG, so a new offer appears
 * without touching this layout. Individual plans and passes are cards; the plan with several
 * seats becomes the full-width team band. Passes render only when the server says their
 * Stripe price is configured (passAvailable).
 */
const PREFERRED_ORDER = ["free", "pass30", "indie", "studio"];
const RECOMMENDED = "indie";

type PlanRecord = Record<string, unknown>;
type PlanId = string;

const planRecords = PLANS as unknown as Record<PlanId, PlanRecord>;
const num = (plan: PlanRecord, key: string) => (typeof plan[key] === "number" ? (plan[key] as number) : null);
const text = ({ t, has }: Translator, key: string, fallback: string) => (has(key) ? t(key) : fallback);

function isPass(id: PlanId): id is OneTimeKind {
  return id in ONE_TIME_CATALOG;
}

/** Entitlements of a plan or pass: a pass carries the quotas of the plan it grants. */
function entitlements(id: PlanId): PlanRecord {
  return isPass(id) ? planRecords[ONE_TIME_CATALOG[id].plan]! : planRecords[id]!;
}

function orderedPlans(withPasses: boolean): PlanId[] {
  const ids = [...Object.keys(planRecords), ...(withPasses ? Object.keys(ONE_TIME_CATALOG) : [])];
  const rank = (id: string) => {
    const index = PREFERRED_ORDER.indexOf(id);
    return index === -1 ? PREFERRED_ORDER.length - 1 : index;
  };
  return ids.sort((a, b) => rank(a) - rank(b));
}

function isTeam(id: PlanId) {
  return !isPass(id) && (num(planRecords[id]!, "seats") ?? 1) > 1;
}

function eur(value: number, locale: Locale) {
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 }).format(value);
  return locale === "fr" ? `${formatted} €` : `€${formatted}`;
}

/** Subscription kinds that belong to a plan: `${id}_monthly` and `${id}_yearly`. */
function kindsFor(id: PlanId): CheckoutKind[] {
  return (Object.keys(CHECKOUT_CATALOG) as CheckoutKind[]).filter((kind) => kind.startsWith(`${id}_`));
}

type Offer = {
  price: string;
  note: string;
  cta: { kind: PurchaseKind; label: string } | { href: string; label: string; testId: string } | null;
};

function offerFor(id: PlanId, i18n: Translator, yearly: boolean): Offer {
  const { locale, t, tf } = i18n;
  const fr = locale === "fr";
  if (isPass(id)) {
    const pass = ONE_TIME_CATALOG[id];
    const price = eur(pass.amountCents / 100, locale);
    return {
      price,
      note: tf("pricing_pass_price", { price }).replace(price, "").trim(),
      cta: { kind: pass.kind, label: tf("pricing_pass_cta", { price: eur(pass.amountCents / 100, locale).replace("\u00a0", " ") }) },
    };
  }
  const plan = planRecords[id]!;
  const title = planTitle(id, i18n);
  if (id === "free") {
    return {
      price: t("pricing_trial_price"),
      note: " ",
      cta: { href: `${localePrefix(locale)}/signup`, label: t("pricing_trial_cta"), testId: "pricing-cta-trial" },
    };
  }
  const monthly = num(plan, "monthlyEur");
  const annual = num(plan, "yearlyEur");
  if (monthly !== null) {
    const showYear = yearly && annual !== null;
    const value = showYear ? annual! : monthly;
    const kind = kindsFor(id).find((item) => item.endsWith(showYear ? "_yearly" : "_monthly"));
    const per = showYear ? t("pricing_per_year") : t("pricing_per_month");
    const note = showYear
      ? `≈ ${eur(Math.round((annual! / 12) * 100) / 100, locale)} ${t("pricing_per_month")} · ${fr ? "2 mois offerts" : "2 months free"}`
      : " ";
    return {
      price: `${eur(value, locale)} ${per}`,
      note,
      cta: kind ? { kind, label: `${title} — ${eur(value, locale).replace(" ", " ")}/${showYear ? (fr ? "an" : "year") : (fr ? "mois" : "month")}` } : null,
    };
  }
  return { price: "—", note: "\u00a0", cta: null };
}

function planTitle(id: PlanId, i18n: Translator) {
  const { t } = i18n;
  if (id === "free") return t("pricing_trial_title");
  if (isPass(id)) return t("pricing_pass_title");
  return text(i18n, `pricing_${id}_title`, id.charAt(0).toUpperCase() + id.slice(1));
}

function planBody(id: PlanId, i18n: Translator) {
  const { t } = i18n;
  if (id === "free") return t("pricing_trial_body");
  if (isPass(id)) return t("pricing_pass_body");
  return text(i18n, `pricing_${id}_body`, "");
}

/** Comparison rows derived from plan fields. */
function comparisonRows(i18n: Translator, ids: PlanId[]) {
  const { locale, t } = i18n;
  const yes = t("pricing_val_yes");
  const no = t("pricing_val_no");
  const fr = locale === "fr";
  const value = (id: PlanId, pick: (plan: PlanRecord) => string) => pick(entitlements(id));
  const quota = (plan: PlanRecord) => {
    const free = num(plan, "freeExports");
    const daily = num(plan, "dailyHdSets");
    if (free !== null) return `${free} ${fr ? "ZIP HD" : "HD ZIPs"}`;
    if (daily !== null) return `${daily} / ${fr ? "jour" : "day"}`;
    return "—";
  };
  const fullFormats = (plan: PlanRecord) => (plan.duoOnly === false ? yes : no);
  const rows: { label: string; pick: (plan: PlanRecord) => string }[] = [
    { label: t("pricing_feat_zip"), pick: (plan) => (num(plan, "freeExports") !== null ? quota(plan) : yes) },
    { label: t("pricing_feat_quota"), pick: quota },
    { label: t("pricing_feat_69"), pick: fullFormats },
    { label: t("pricing_feat_sets"), pick: () => yes },
    { label: t("pricing_feat_prefix"), pick: fullFormats },
    { label: fr ? "Sièges" : "Seats", pick: (plan) => String(num(plan, "seats") ?? 1) },
    { label: t("pricing_feat_review"), pick: (plan) => ((num(plan, "seats") ?? 1) > 1 ? yes : no) },
  ];
  return rows.map((row) => ({ label: row.label, cells: ids.map((id) => value(id, row.pick)) }));
}

function OfferCta({ locale, offer, featured, available }: { locale: Locale; offer: Offer; featured: boolean; available?: boolean }) {
  if (!offer.cta) return null;
  const className = featured ? "ds-cta" : "ds-cta-ghost";
  if ("kind" in offer.cta) {
    return <PricingCta locale={locale} kind={offer.cta.kind} label={offer.cta.label} className={className} initialAvailable={available} />;
  }
  return <Link href={offer.cta.href} data-testid={offer.cta.testId} className={className}>{offer.cta.label}</Link>;
}

export function PricingSection({
  locale,
  heading = "h2",
  compact = false,
  checkoutAvailable,
  passAvailable = false,
}: {
  locale: Locale;
  heading?: "h1" | "h2";
  /** Home page: cards and reassurance only, with a link to the full comparison. */
  compact?: boolean;
  /** Server-read availability so the first HTML shows the right buttons; omitted = checked after mount. */
  checkoutAvailable?: boolean;
  /** One-time passes render only when the server says their Stripe price is configured. */
  passAvailable?: boolean;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const [yearly, setYearly] = useState(false);
  const fr = locale === "fr";
  const ids = orderedPlans(passAvailable);
  const cards = ids.filter((id) => !isTeam(id));
  const teams = ids.filter(isTeam);
  const Title = heading;
  // Local projects are covered by the Studio question in the general FAQ below the section.
  const faq = [
    { q: t("pricing_faq_refund_q"), a: t("pricing_faq_refund_a") },
    { q: t("pricing_faq_apple_q"), a: appleUploadStatus(locale) },
  ];

  return (
    <section id="pricing" data-testid="pricing" className={`studio-pricing scroll-mt-24${compact ? " is-compact" : ""}`} data-reveal>
      <div className="studio-pricing-head">
        <div>
          <Title>{t("pricing_title")}</Title>
          <p className="studio-pricing-lead">{t("pricing_lead")}</p>
          <p className="studio-pricing-free">{t("pricing_free_body")}</p>
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
          const offer = offerFor(id, i18n, yearly);
          const featured = id === RECOMMENDED;
          return (
            <article key={id} className={`studio-plan${featured ? " is-featured" : ""}`} data-plan={id} data-testid={isPass(id) ? `pricing-${id}` : undefined}>
              <div className="studio-plan-title">
                <h3>{planTitle(id, i18n)}</h3>
                {featured ? <span className="studio-plan-badge">{t("pricing_featured")}</span> : null}
              </div>
              <p className="studio-plan-price">{offer.price}</p>
              <p className="studio-plan-note">{offer.note}</p>
              <p className="studio-plan-body">{planBody(id, i18n)}</p>
              <div className="studio-plan-cta"><OfferCta locale={locale} offer={offer} featured={featured} available={checkoutAvailable} /></div>
            </article>
          );
        })}
      </div>

      {teams.map((id) => {
        const offer = offerFor(id, i18n, yearly);
        return (
          <article key={id} className="studio-plan-team" data-plan={id}>
            <div className="studio-plan-team-copy">
              <p className="studio-eyebrow">{t("pricing_team_kicker")}</p>
              <h3>{planTitle(id, i18n)}</h3>
              <p className="studio-plan-body">{planBody(id, i18n)}</p>
              <p className="studio-plan-seats">{t("pricing_seats_soon")}</p>
              <p className="studio-plan-local" data-testid={`pricing-note-${id}`}>{t("pricing_local_projects")}</p>
            </div>
            <div className="studio-plan-team-offer">
              <p className="studio-plan-price">{offer.price}</p>
              <p className="studio-plan-note">{offer.note}</p>
              <OfferCta locale={locale} offer={offer} featured={false} available={checkoutAvailable} />
              <Link href={reviewPath(locale, "harbor")} data-testid="pricing-review-demo" className="studio-inline-link">
                {t("cta_review_demo")} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        );
      })}

      <ul className="studio-reassurance" aria-label={fr ? "Paiement" : "Payment"}>
        <li>{t("pricing_reassurance_stripe")}</li>
        <li>{t("pricing_reassurance_cancel")}</li>
        <li>{t("pricing_reassurance_invoice")}</li>
      </ul>
      <p className="studio-pricing-note">{t("pricing_note")}</p>

      {compact ? (
        <Link href={pricingPath(locale)} className="studio-inline-link studio-pricing-more">
          {t("pricing_compare_link")} <span aria-hidden="true">↗</span>
        </Link>
      ) : (
        <>
          <div className="studio-compare">
            <h2>{t("pricing_compare_title")}</h2>
            <div className="studio-compare-scroll">
              <table>
                <caption className="sr-only">{t("pricing_compare_title")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("pricing_compare_feature")}</th>
                    {ids.map((id) => <th key={id} scope="col" className={id === RECOMMENDED ? "is-featured" : undefined}>{planTitle(id, i18n)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows(i18n, ids).map((row) => (
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
            <h2>{t("pricing_faq_title")}</h2>
            <FaqList items={faq} />
          </div>
        </>
      )}
    </section>
  );
}
