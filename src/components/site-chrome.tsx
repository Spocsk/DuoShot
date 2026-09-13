import Link from "next/link";
import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";
import { localePrefix, localizedPath } from "@/lib/site";
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
      <div className="mx-auto flex min-h-[var(--header-h)] max-w-6xl items-center justify-between gap-x-4 px-5 py-3">
        <Link href={home} className="relative z-[60] font-display text-xl tracking-tight">
          DuoShot
        </Link>
        <nav className="hidden items-center justify-end gap-x-4 text-sm text-[var(--muted)] md:flex">
          <a href={`${home}#pricing`} className="hover:text-[var(--foreground)]">
            {t(locale, "nav_pricing")}
          </a>
          <Link href={`${prefix}/specs`} className="hover:text-[var(--foreground)]">
            {t(locale, "nav_specs")}
          </Link>
          <Link href={`${prefix}/tool`} className="hover:text-[var(--foreground)]">
            {t(locale, "nav_tool")}
          </Link>
          <HeaderAuth locale={locale} />
          <LocaleSwitch locale={locale} href={otherHref} />
        </nav>
        <SiteNav locale={locale} home={home} prefix={prefix} otherHref={otherHref} />
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  return (
    <footer className="mt-auto border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-5 py-8 text-sm text-[var(--muted)]">
        <span>© {new Date().getFullYear()} DuoShot</span>
        <Link href={`${prefix}/legal`}>{t(locale, "footer_legal")}</Link>
        <Link href={`${prefix}/terms`}>{t(locale, "footer_terms")}</Link>
        <Link href={`${prefix}/privacy`}>{t(locale, "footer_privacy")}</Link>
        <Link href={`${prefix}/cookies`}>{t(locale, "footer_cookies")}</Link>
        <Link href={`${prefix}/legal/subprocessors`}>{t(locale, "footer_subprocessors")}</Link>
        <Link href="/llms.txt">llms.txt</Link>
      </div>
    </footer>
  );
}
