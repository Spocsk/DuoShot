import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { localePrefix } from "@/lib/site";

const COLS = ["alpha", "clone", "hinge", "zip"] as const;

export function WhyNotAiPage({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={locale === "en" ? "/en/why-not-ai" : "/pourquoi-pas-ia"} />
      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-display text-5xl">{t(locale, "why_title")}</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">{t(locale, "why_lead")}</p>
        <div className="mt-8 max-w-2xl space-y-4 text-[1.05rem] leading-relaxed">
          <p>{t(locale, "why_p1")}</p>
          <p>{t(locale, "why_p2")}</p>
          <p>{t(locale, "why_p3")}</p>
        </div>
        <p className="ds-label mt-8">{t(locale, "example_listing")}</p>
        <div className="mt-12 space-y-10">
          {COLS.map((key) => (
            <section key={key} className="border-t border-[var(--line)] pt-6">
              <h2 className="font-display text-3xl">{t(locale, `ai_${key}_title`)}</h2>
              <p className="mt-3 text-[var(--muted)]">{t(locale, `ai_${key}_ai`)}</p>
              <p className="mt-2">{t(locale, `ai_${key}_us`)}</p>
            </section>
          ))}
        </div>
        <Link href={`${prefix}/tool`} className="ds-cta mt-12 inline-flex">
          {t(locale, "cta_tool")}
        </Link>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
