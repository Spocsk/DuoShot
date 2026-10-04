import { connection } from "next/server";
import { FAQ, t } from "@/lib/i18n";
import { checkoutAvailable, passCheckoutAvailable } from "@/lib/billing-availability";
import type { Locale } from "@/lib/specs";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PricingSection } from "@/components/pricing-section";
import { TrustLine } from "@/components/trust-line";
import { FaqList } from "@/components/faq-list";

export async function PricingPage({ locale }: { locale: Locale }) {
  // Checkout availability comes from runtime env (absent at image build time), so
  // render per request: the first HTML then shows the real buttons, not a disabled flash.
  await connection();
  const available = checkoutAvailable();
  const passAvailable = passCheckoutAvailable();
  const faq = FAQ[locale];
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/pricing" />
      <main id="main">
        <PricingSection locale={locale} heading="h1" checkoutAvailable={available} passAvailable={passAvailable} />
        <div className="mx-auto max-w-6xl px-5 pb-10">
          <TrustLine locale={locale} />
        </div>
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="font-display text-4xl">{t(locale, "faq_title")}</h2>
          <FaqList items={faq} />
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
