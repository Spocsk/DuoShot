import Link from "next/link";
import { FAQ, t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export function HomePage({ locale }: { locale: Locale }) {
  const prefix = locale === "en" ? "/en" : "";
  const faq = FAQ[locale];
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/" />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">
              {t(locale, "hero_kicker")}
            </p>
            <h1 className="mt-4 max-w-xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] md:text-6xl">
              {t(locale, "pitch")}
            </h1>
            <p className="mt-6 max-w-lg text-lg text-[var(--muted)]">{t(locale, "hero_lead")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${prefix}/tool`}
                className="rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-[#111]"
              >
                {t(locale, "cta_tool")}
              </Link>
              <Link href={`${prefix}/specs`} className="rounded-full border border-white/15 px-5 py-3">
                {t(locale, "cta_specs")}
              </Link>
            </div>
          </div>
          <DualShelf />
        </section>
        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">{t(locale, "how_title")}</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[t(locale, "how_1"), t(locale, "how_2"), t(locale, "how_3")].map((item, index) => (
              <li key={item} className="rounded-3xl border border-white/8 bg-[#141821] p-5">
                <span className="text-[var(--accent)]">0{index + 1}</span>
                <p className="mt-3">{item}</p>
              </li>
            ))}
          </ol>
        </section>
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">{t(locale, "pricing_title")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[t(locale, "plan_free"), t(locale, "plan_indie"), t(locale, "plan_studio"), t(locale, "plan_pack")].map(
              (item) => (
                <p key={item} className="rounded-3xl border border-white/8 bg-[#141821] p-5">
                  {item}
                </p>
              ),
            )}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">{t(locale, "faq_title")}</h2>
          <dl className="mt-6 grid gap-4">
            {faq.map((item) => (
              <div key={item.q} className="rounded-3xl border border-white/8 bg-[#141821] p-5">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-2 text-[var(--muted)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

function DualShelf() {
  return (
    <div className="relative mx-auto grid w-full max-w-md grid-cols-[0.72fr_12px_1fr] items-end">
      <div className="rounded-[28px] border border-white/12 bg-gradient-to-b from-[#1c2433] to-[#0e1016] p-3 shadow-[0_30px_80px_#000]">
        <div className="aspect-[1398/2034] rounded-[18px] bg-[linear-gradient(180deg,#c8f54222,transparent),#151922]" />
        <p className="mt-3 text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted)]">
          1398×2034
        </p>
      </div>
      <div className="mb-16 h-24 bg-[var(--accent)]/70" />
      <div className="rounded-[32px] border border-white/12 bg-gradient-to-b from-[#24202e] to-[#0e1016] p-3 shadow-[0_30px_80px_#000]">
        <div className="aspect-[2007/2853] rounded-[22px] bg-[linear-gradient(180deg,#7aa2ff22,transparent),#151922]" />
        <p className="mt-3 text-center font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted)]">
          2007×2853
        </p>
      </div>
    </div>
  );
}
