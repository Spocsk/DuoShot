import Link from "next/link";
import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";
import { localizedPath } from "@/lib/site";

type Props = {
  locale: Locale;
  path: string;
};

export function SiteHeader({ locale, path }: Props) {
  const other = locale === "fr" ? "en" : "fr";
  const otherHref = locale === "fr" ? localizedPath("en", path) : localizedPath("fr", path);
  const prefix = locale === "en" ? "/en" : "";
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0B0D12]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href={prefix || "/"} className="font-[family-name:var(--font-display)] text-lg tracking-tight">
          DuoShot
        </Link>
        <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
          <Link href={`${prefix}/specs`} className="hover:text-[var(--accent)]">
            {t(locale, "nav_specs")}
          </Link>
          <Link href={`${prefix}/tool`} className="hover:text-[var(--accent)]">
            {t(locale, "nav_tool")}
          </Link>
          <Link href={`${prefix}/login`} className="hover:text-[var(--accent)]">
            {t(locale, "nav_login")}
          </Link>
          <Link
            href={`${prefix}/signup`}
            className="rounded-full bg-[var(--accent)] px-3 py-1.5 font-medium text-[#111]"
          >
            {t(locale, "nav_signup")}
          </Link>
          <Link href={otherHref} hrefLang={other} className="uppercase tracking-wider">
            {t(locale, "lang_switch")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const prefix = locale === "en" ? "/en" : "";
  return (
    <footer className="mt-auto border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-5 py-8 text-sm text-[var(--muted)]">
        <span>© {new Date().getFullYear()} DuoShot</span>
        <Link href={`${prefix}/privacy`}>Privacy</Link>
        <Link href={`${prefix}/terms`}>Terms</Link>
        <Link href={`${prefix}/cookies`}>Cookies</Link>
        <Link href={`${prefix}/legal/subprocessors`}>Sous-traitants</Link>
        <Link href="/llms.txt">llms.txt</Link>
      </div>
    </footer>
  );
}
