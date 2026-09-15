import { FAQ, t } from "@/lib/i18n";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { APP_STORE_DISCLAIMER_233, SIZE_SPECS, SPECS_VERSION_DATE, type Locale } from "@/lib/specs";

export function SpecsPage({ locale }: { locale: Locale }) {
  const faq = FAQ[locale];
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} />
      <SiteHeader locale={locale} path="/specs" />
      <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
        <p className="ds-label">{SPECS_VERSION_DATE}</p>
        <h1 className="font-display mt-3 text-5xl">{t(locale, "specs_title")}</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">{t(locale, "specs_intro")}</p>
        <div className="mt-8 overflow-x-auto border-t border-[var(--line)]">
          <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
            <thead className="ds-spec-head">
              <tr>
                <th scope="col" className="px-0 py-3 pr-4 font-medium">Slot</th>
                <th scope="col" className="px-4 py-3 font-medium">Pouces</th>
                <th scope="col" className="px-4 py-3 font-medium">Orientation</th>
                <th scope="col" className="px-4 py-3 font-medium">Pixels</th>
                <th scope="col" className="px-4 py-3 font-medium">Plan</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_SPECS.map((spec) => (
                <tr key={spec.id} className="border-t border-[var(--line)]">
                  <td className="py-3 pr-4">{spec.label}</td>
                  <td className="px-4 py-3">{spec.inches}</td>
                  <td className="px-4 py-3">{spec.orientation}</td>
                  <td className="px-4 py-3 font-mono">
                    {spec.width}×{spec.height}
                  </td>
                  <td className="px-4 py-3">
                    {spec.gated ? t(locale, "spec_plan_paid") : t(locale, "spec_plan_free")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-3xl text-sm text-[var(--muted)]">{APP_STORE_DISCLAIMER_233}</p>
        <section className="mt-12">
          <h2 className="font-display text-3xl">{t(locale, "faq_title")}</h2>
          <dl className="mt-6">
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
