import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "@/lib/screenshot-copy";
import { localePrefix } from "@/lib/site";

const CARDS = [
  { code: "dimensions / dimensions", title: "reject_dimensions_title", body: "reject_dimensions_body", cta: "specs" },
  { code: "transparence / alpha", title: "reject_1_title", body: "reject_alpha_body", cta: "tool" },
  { code: "contenu / content", title: "reject_2_title", body: "reject_2_body", cta: "tool" },
  { code: "set / set", title: "reject_incomplete_title", body: "reject_incomplete_body", cta: "tool" },
  { code: "vidéo / video", title: "reject_video_title", body: "reject_video_body", cta: "none" },
] as const;

export function RejectionPage({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  const prefix = localePrefix(locale);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={locale === "en" ? "/en/rejection" : "/rejet"} />
      <main id="main" className="mx-auto w-full max-w-3xl px-5 py-12">
        <h1 className="font-display text-5xl">{t("reject_app_store_screenshot_errors")}</h1>
        <p className="mt-4 text-lg text-[var(--muted)]">{t("reject_wrong_screenshot_dimensions_alpha")}</p>
        <div className="mt-12">
          {CARDS.map((card) => (
            <article key={card.code} className="border-t border-[var(--line)] py-8">
              <p className="font-mono text-xs tracking-[0.14em] text-[var(--muted)]">{card.code}</p>
              <h2 className="mt-3 text-xl">{t(card.title)}</h2>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">{card.body === "reject_dimensions_body"
                ? tf(card.body, { outerPortrait: OUTER_PORTRAIT, innerPortrait: INNER_PORTRAIT })
                : t(card.body)}</p>
              {card.cta === "tool" ? (
                <Link href={`${prefix}/tool`} className="ds-link mt-4 inline-block">
                  {t("cta_open_tool")}
                </Link>
              ) : null}
              {card.cta === "specs" ? (
                <Link href={`${prefix}/specs`} className="ds-link mt-4 inline-block">
                  {t("cta_specs")}
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
