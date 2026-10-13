import { connection } from "next/server";
import { getTranslator } from "@/lib/i18n";
import { FAQ } from "@/lib/i18n";
import { checkoutDisplayAvailable, passCheckoutAvailable } from "@/lib/billing-availability";
import type { Locale } from "@/lib/specs";
import { pricingFaq } from "@/lib/pricing-faq";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PricingSection } from "@/components/pricing-section";
import { FaqList } from "@/components/faq-list";

export async function PricingPage({ locale }: { locale: Locale }) {
  const i18n = getTranslator(locale);
  const { t } = i18n;
  // Checkout availability comes from runtime env (absent at image build time), so
  // render per request: the first HTML then shows the real buttons, not a disabled flash.
  await connection();
  const available = checkoutDisplayAvailable();
  const passAvailable = passCheckoutAvailable();
  const faq = [...pricingFaq(i18n), ...FAQ[locale]];
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} path="/pricing" software faq={faq} />
      <SiteHeader locale={locale} path="/pricing" />
      <main id="main">
        <PricingSection locale={locale} heading="h1" checkoutAvailable={available} passAvailable={passAvailable} />
        <section className="mx-auto max-w-6xl px-5 pb-16" data-testid="pricing-faq">
          <h2 className="font-display text-4xl">{t("pricing_faq_title")}</h2>
          <FaqList items={faq} />
        </section>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
