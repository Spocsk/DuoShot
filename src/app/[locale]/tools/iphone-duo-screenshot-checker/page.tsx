import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { ScreenshotChecker } from "@/components/screenshot-checker";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { CHECKER_SPECS, SCREENSHOT_CHECKER_PATH } from "@/lib/screenshot-checker";
import { screenshotCheckerCopy } from "@/lib/screenshot-checker-copy";
import { localizedPath, toolPath } from "@/lib/site";
import { formatInches } from "@/lib/specs";
import { pageLocale, type LocaleParams } from "../../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: SCREENSHOT_CHECKER_PATH, ...screenshotCheckerCopy(locale) });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const copy = screenshotCheckerCopy(locale);
  const { t } = getTranslator(locale);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={SCREENSHOT_CHECKER_PATH} software={{ name: copy.title, description: copy.description }} faq={copy.faq} />
    <SiteHeader locale={locale} path={SCREENSHOT_CHECKER_PATH} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <h1 className="font-display text-4xl sm:text-5xl">{copy.title}</h1>
      <p className="mt-4 text-lg">{copy.intro}</p>
      <p id="checker-privacy" className="mt-4 font-medium">{copy.privacy}</p>
      <ScreenshotChecker locale={locale} labels={copy.labels} />
      <section className="mt-10" aria-labelledby="checker-sizes">
        <h2 id="checker-sizes" className="font-display text-3xl">{copy.sizes}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">{copy.sizes}</caption>
            <thead><tr>
              <th scope="col" className="py-3 pr-4">{t("specs_display")}</th>
              <th scope="col" className="py-3 pr-4">{t("specs_portrait")}</th>
              <th scope="col" className="py-3">{t("specs_landscape")}</th>
            </tr></thead>
            <tbody>{CHECKER_SPECS.filter((spec) => spec.orientation === "portrait").map((spec) => <tr key={spec.id} className="border-t border-[var(--line)]">
              <th scope="row" className="py-3 pr-4 font-normal">{spec.slot === "duo-outer" ? `iPhone Duo — ${copy.labels.outer}` : spec.slot === "duo-inner" ? `iPhone Duo — ${copy.labels.inner}` : "iPhone"} {formatInches(spec.inches, locale)}</th>
              <td className="py-3 pr-4 whitespace-nowrap">{spec.width} × {spec.height}</td>
              <td className="py-3 whitespace-nowrap">{spec.height} × {spec.width}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">{copy.scope}</p>
        <p className="mt-4 flex flex-wrap gap-4">
          <a className="ds-link" href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications">{t("specs_read_connect_specifications")}</a>
          <Link className="ds-link" href={localizedPath(locale, "/specs")}>{t("specs_iphone_duo_screenshot_sizes")}</Link>
        </p>
      </section>
      <Button as="link" variant="primary" href={toolPath(locale)} className="mt-8">{copy.cta}</Button>
      <section className="mt-12" aria-labelledby="checker-faq">
        <h2 id="checker-faq" className="font-display text-3xl">{copy.faqHeading}</h2>
        <FaqList items={copy.faq} />
      </section>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
