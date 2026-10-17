import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { Locale } from "@/lib/specs";
import { POLICY_VERSION } from "@/lib/specs";
import { localePrefix } from "@/lib/site";
import { getTranslator } from "@/lib/i18n";
import { FREE_EXPORTS, PASS30, PLANS, STUDIO_SEATS } from "@/lib/plans";

export function LegalPage({
  locale,
  path,
  title,
  children,
}: {
  locale: Locale;
  path: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={path} />
      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-12">
        <p className="ds-label">{POLICY_VERSION}</p>
        <h1 className="font-display mt-3 text-4xl">{title}</h1>
        <div className="mt-8 grid gap-8 text-[var(--muted)] leading-relaxed">{children}</div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl text-[var(--foreground)]">{title}</h2>
      {children}
    </section>
  );
}

// Only these inline tags are rendered; dictionary text never becomes raw HTML.
function LegalText({ locale, text }: { locale: Locale; text: string }) {
  const prefix = localePrefix(locale);
  const paths = { account: "/account", privacy: "/privacy", subprocessors: "/legal/subprocessors" };
  return text.split(/(<(?:account|privacy|subprocessors|code)>.*?<\/(?:account|privacy|subprocessors|code)>)/g).map((part, index) => {
    const match = part.match(/^<(account|privacy|subprocessors|code)>(.*?)<\/\1>$/);
    if (!match) return part;
    const [, tag, label] = match;
    if (tag === "code") return <code key={index}>{label}</code>;
    return <Link key={index} href={`${prefix}${paths[tag as keyof typeof paths]}`} className="ds-link">{label}</Link>;
  });
}

export function MentionsContent({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  return (
    <>
      <p>{tf("legal_notice_intro", { policyVersion: POLICY_VERSION })}</p>
      <Block title={t("legal_notice_publisher_title")}>
        <p>{t("legal_notice_publisher")}</p>
        <p><LegalText locale={locale} text={t("legal_notice_publisher_details")} /></p>
      </Block>
      <Block title={t("legal_notice_host_title")}>
        <p><LegalText locale={locale} text={t("legal_notice_host")} /></p>
      </Block>
    </>
  );
}

export function PrivacyContent({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  return (
    <>
      <p>{tf("legal_privacy_intro", { policyVersion: POLICY_VERSION })}</p>
      <Block title={t("legal_privacy_data_title")}>
        <p>{t("legal_privacy_data")}</p>
      </Block>
      <Block title={t("legal_privacy_bases_title")}>
        <p>{t("legal_privacy_bases")}</p>
      </Block>
      <Block title={t("legal_privacy_transfers_title")}>
        <p><LegalText locale={locale} text={t("legal_privacy_transfers")} /></p>
      </Block>
      <Block title={t("legal_privacy_retention_title")}>
        <p>{t("legal_privacy_retention")}</p>
      </Block>
      <Block title={t("legal_privacy_rights_title")}>
        <p><LegalText locale={locale} text={t("legal_privacy_rights")} /></p>
      </Block>
    </>
  );
}

export function TermsContent({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  return (
    <>
      <p>{tf("legal_terms_intro", { policyVersion: POLICY_VERSION })}</p>
      <Block title={t("legal_terms_service_title")}>
        <p>{t("legal_terms_service")}</p>
      </Block>
      <Block title={t("legal_terms_eligibility_title")}>
        <p>{t("legal_terms_eligibility")}</p>
      </Block>
      <Block title={t("legal_terms_account_title")}>
        <p>{t("legal_terms_account")}</p>
      </Block>
      <Block title={t("legal_terms_plans_title")}>
        <p>{tf("legal_terms_plans", { freeExports: FREE_EXPORTS, indieMonthly: PLANS.indie.monthlyEur, indieYearly: PLANS.indie.yearlyEur, dailyExports: PLANS.indie.dailyHdSets, studioMonthly: PLANS.studio.monthlyEur, studioYearly: PLANS.studio.yearlyEur, studioSeats: STUDIO_SEATS, passDays: PASS30.days, passPrice: PASS30.priceEur })}</p>
      </Block>
      <Block title={t("legal_terms_withdrawal_title")}>
        <p>{t("legal_terms_withdrawal")}</p>
      </Block>
      <Block title={t("legal_terms_property_title")}>
        <p>{t("legal_terms_property")}</p>
      </Block>
      <Block title={t("legal_terms_liability_title")}>
        <p>{t("legal_terms_liability")}</p>
      </Block>
      <Block title={t("legal_terms_data_title")}>
        <p><LegalText locale={locale} text={t("legal_terms_data")} /></p>
      </Block>
      <Block title={t("legal_terms_law_title")}>
        <p>{t("legal_terms_law")}</p>
      </Block>
    </>
  );
}

export function CookiesContent({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  return (
    <>
      <p>{tf("legal_cookies_intro", { policyVersion: POLICY_VERSION })}</p>
      <Block title={t("legal_cookies_necessary_title")}>
        <p><LegalText locale={locale} text={t("legal_cookies_necessary")} /></p>
      </Block>
      <Block title={t("legal_cookies_analytics_title")}>
        <p><LegalText locale={locale} text={t("legal_cookies_analytics")} /></p>
      </Block>
    </>
  );
}

export function SubprocessorsContent({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  return (
    <>
      <p>{tf("legal_dated_list", { policyVersion: POLICY_VERSION })}</p>
      <ul className="list-disc pl-5">
        <li>{t("legal_hetzner_application_hosting_self")}</li>
        <li>{t("legal_vercel_domain_registration_dns")}</li>
        <li>{t("legal_processor_datafast")}</li>
        <li>{t("legal_mixpanel_no_longer_collects")}</li>
        <li>{t("legal_processor_stripe")}</li>
        <li>{t("legal_processor_resend")}</li>
        <li>{t("legal_processor_google")}</li>
      </ul>
      <p>
        {t("legal_dpas_should_in_place")}
      </p>
    </>
  );
}
