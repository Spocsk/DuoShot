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
      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
          {SPECS_VERSION_DATE}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">{t(locale, "specs_title")}</h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">{t(locale, "specs_intro")}</p>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#141821] font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Pouces</th>
                <th className="px-4 py-3">Orientation</th>
                <th className="px-4 py-3">Pixels</th>
                <th className="px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_SPECS.map((spec) => (
                <tr key={spec.id} className="border-t border-white/8">
                  <td className="px-4 py-3">{spec.label}</td>
                  <td className="px-4 py-3">{spec.inches}</td>
                  <td className="px-4 py-3">{spec.orientation}</td>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)]">
                    {spec.width}×{spec.height}
                  </td>
                  <td className="px-4 py-3">{spec.gated ? "Indie/Studio" : "Free+"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-3xl text-sm text-[var(--muted)]">{APP_STORE_DISCLAIMER_233}</p>
        <section className="mt-12">
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
