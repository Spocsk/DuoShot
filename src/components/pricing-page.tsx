import { FAQ, t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PricingSection } from "@/components/pricing-section";
import { TrustLine } from "@/components/trust-line";

export function PricingPage({ locale }: { locale: Locale }) {
  const faq = FAQ[locale];
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/pricing" />
      <main id="main">
        <PricingSection locale={locale} heading="h1" />
        <div className="mx-auto max-w-6xl px-5 pb-10">
          <TrustLine locale={locale} />
        </div>
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="font-display text-4xl">{t(locale, "faq_title")}</h2>
          <dl className="mt-8">
            {faq.map((item) => (
              <div key={item.q} className="border-t border-[var(--line)] py-6">
                <dt className="text-lg">{item.q}</dt>
                <dd className="mt-2 max-w-3xl text-[var(--muted)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
