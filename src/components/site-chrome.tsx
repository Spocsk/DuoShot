import Link from "next/link";
import type { Locale } from "@/lib/specs";
import { getTranslator } from "@/lib/i18n";
import { localePrefix, localizedPath, pricingPath, rejectionPath } from "@/lib/site";
import { HeaderAuth } from "@/components/header-auth";
import { LocaleSwitch } from "@/components/locale-switch";
import { SiteNav } from "@/components/site-nav";
import { AnalyticsSettingsButton } from "@/components/analytics-settings-button";

type Props = {
  locale: Locale;
  path: string;
};

export function SiteHeader({ locale, path }: Props) {
  const { t } = getTranslator(locale);
  const otherHref = locale === "fr" ? localizedPath("en", path) : localizedPath("fr", path);
  const prefix = localePrefix(locale);
  const home = prefix || "/";
  const current = localizedPath(locale, path);
  const links = [
    { href: `${prefix}/tool`, label: t("nav_tool"), testId: "nav-tool" },
    { href: `${prefix}/specs`, label: t("nav_specs"), testId: "nav-specs" },
    { href: rejectionPath(locale), label: t("nav_rejection"), testId: "nav-reject" },
    { href: pricingPath(locale), label: t("nav_pricing"), testId: "nav-pricing" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-md">
      <a className="ds-skip" href="#main">
        {t("skip_main")}
      </a>
      <div className="mx-auto flex min-h-[var(--header-h)] max-w-6xl items-center justify-between gap-x-4 px-5">
        <Link href={home} className="site-wordmark relative z-[60] font-display text-xl tracking-tight">
          DuoShot
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-x-2">
          <nav className="hidden items-center justify-end gap-x-3 text-sm md:flex">
            {links.map((link) => (
              <Link key={link.testId} href={link.href} data-testid={link.testId} className="ds-nav-link" aria-current={current === link.href ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
            <HeaderAuth locale={locale} />
          </nav>
          <LocaleSwitch locale={locale} href={otherHref} />
          <SiteNav locale={locale} prefix={prefix} current={current} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const prefix = localePrefix(locale);
  return (
    <footer className="ds-footer mt-auto border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-6 text-sm text-[var(--muted)]">
        <span>© {new Date().getFullYear()} DuoShot</span>
        <span data-testid="footer-privacy-line">{t("trust_retention")}</span>
        <span>{t("footer_stripe")}</span>
        <Link href={`${prefix}/specs`}>{t("nav_specs")}</Link>
        <Link href={`${prefix}/legal`}>{t("footer_legal")}</Link>
        <Link href={`${prefix}/terms`}>{t("footer_terms")}</Link>
        <Link href={`${prefix}/privacy`}>{t("footer_privacy")}</Link>
        <Link href={`${prefix}/cookies`}>{t("footer_cookies")}</Link>
        <AnalyticsSettingsButton locale={locale} />
        <Link href={`${prefix}/legal/subprocessors`}>{t("footer_subprocessors")}</Link>
        <Link href={locale === "en" ? "/en/why-not-ai" : "/pourquoi-pas-ia"} data-testid="footer-why">{t("footer_why")}</Link>
        <Link href={rejectionPath(locale)} data-testid="footer-reject">{t("footer_reject")}</Link>
        <Link href="/llms.txt">llms.txt</Link>
      </div>
    </footer>
  );
}
