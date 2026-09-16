import Link from "next/link";
import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";
import { localePrefix, localizedPath, pricingPath, rejectionPath } from "@/lib/site";
import { HeaderAuth } from "@/components/header-auth";
import { LocaleSwitch } from "@/components/locale-switch";
import { SiteNav } from "@/components/site-nav";

type Props = {
  locale: Locale;
  path: string;
};

export function SiteHeader({ locale, path }: Props) {
  const otherHref = locale === "fr" ? localizedPath("en", path) : localizedPath("fr", path);
  const prefix = localePrefix(locale);
  const home = prefix || "/";
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-md">
      <a className="ds-skip" href="#main">
        {t(locale, "skip_main")}
      </a>
      <div className="mx-auto flex min-h-[var(--header-h)] max-w-6xl items-center justify-between gap-x-4 px-5">
        <Link href={home} className="relative z-[60] font-display text-xl tracking-tight">
          DuoShot
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-x-2">
          <nav className="hidden items-center justify-end gap-x-3 text-sm md:flex">
            <Link href={`${prefix}/tool`} data-testid="nav-tool" className="ds-nav-link">
              {t(locale, "nav_tool")}
            </Link>
            <Link href={`${prefix}/specs`} data-testid="nav-specs" className="ds-nav-link">
              {t(locale, "nav_specs")}
            </Link>
            <Link href={rejectionPath(locale)} data-testid="nav-reject" className="ds-nav-link">
              {t(locale, "nav_rejection")}
            </Link>
            <Link href={pricingPath(locale)} data-testid="nav-pricing" className="ds-nav-link">
              {t(locale, "nav_pricing")}
            </Link>
            <HeaderAuth locale={locale} />
          </nav>
          <LocaleSwitch locale={locale} href={otherHref} />
          <SiteNav locale={locale} prefix={prefix} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  return (
    <footer className="ds-footer mt-auto border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-6 text-sm text-[var(--muted)]">
        <span>© {new Date().getFullYear()} DuoShot</span>
        <span data-testid="footer-privacy-line">{t(locale, "trust_retention")}</span>
        <span>{t(locale, "footer_stripe")}</span>
        <Link href={`${prefix}/specs`}>{t(locale, "nav_specs")}</Link>
        <Link href={`${prefix}/legal`}>{t(locale, "footer_legal")}</Link>
        <Link href={`${prefix}/terms`}>{t(locale, "footer_terms")}</Link>
        <Link href={`${prefix}/privacy`}>{t(locale, "footer_privacy")}</Link>
        <Link href={`${prefix}/cookies`}>{t(locale, "footer_cookies")}</Link>
        <Link href={`${prefix}/legal/subprocessors`}>{t(locale, "footer_subprocessors")}</Link>
        <Link href={locale === "en" ? "/en/why-not-ai" : "/pourquoi-pas-ia"} data-testid="footer-why">{t(locale, "footer_why")}</Link>
        <Link href={rejectionPath(locale)} data-testid="footer-reject">{t(locale, "footer_reject")}</Link>
        <Link href="/llms.txt">llms.txt</Link>
      </div>
    </footer>
  );
}
