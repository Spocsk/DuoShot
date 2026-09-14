import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { localePrefix } from "@/lib/site";

const CARDS = [
  { code: "2.3.3 / don’t accurately reflect", title: "reject_2_title", body: "reject_2_body", cta: "tool" },
  { code: "incorrect size / dimensions", title: "reject_3_title", body: "reject_3_body", cta: "specs" },
  { code: "transparency / alpha", title: "reject_1_title", body: "reject_1_body", cta: "tool" },
  { code: "4.2.3 / incomplete", title: "reject_incomplete_title", body: "reject_incomplete_body", cta: "tool" },
  { code: "preview video", title: "reject_video_title", body: "reject_video_body", cta: "none" },
] as const;

export function RejectionPage({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={locale === "en" ? "/en/rejection" : "/rejet"} />
      <main className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-display text-5xl">{t(locale, "reject_page_title")}</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">{t(locale, "reject_page_lead")}</p>
        <div className="mt-12">
          {CARDS.map((card) => (
            <article key={card.code} className="border-t border-[var(--line)] py-8">
              <p className="font-mono text-xs tracking-[0.14em] text-[var(--muted)]">{card.code}</p>
              <p className="mt-3 text-xl">{t(locale, card.title)}</p>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">{t(locale, card.body)}</p>
              {card.cta === "tool" ? (
                <Link href={`${prefix}/tool`} className="ds-link mt-4 inline-block">
                  {t(locale, "cta_tool")}
                </Link>
              ) : null}
              {card.cta === "specs" ? (
                <Link href={`${prefix}/specs`} className="ds-link mt-4 inline-block">
                  {t(locale, "cta_specs")}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
