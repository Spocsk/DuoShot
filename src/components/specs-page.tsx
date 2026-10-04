import Link from "next/link";
import { AppleAvailability } from "./apple-availability";
import { JsonLd } from "@/lib/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { appStoreDisclaimer233, formatInches, SIZE_SPECS, SPECS_VERSION_DATE, specRowDetail, type Locale, type SizeSpec } from "@/lib/specs";
import { FaqList } from "@/components/faq-list";
import { APPLE_DEVICE_SOURCE, APPLE_SCREENSHOT_SOURCE } from "@/lib/apple-screenshot-status";
import { INNER_PORTRAIT, OUTER_PORTRAIT, screenshotDimensions, SPECS_FAQ } from "@/lib/screenshot-copy";
import { toolPath } from "@/lib/site";
import { getTranslator } from "@/lib/i18n";

function SpecsTable({ locale, specs, caption }: { locale: Locale; specs: SizeSpec[]; caption: string }) {
  const { t } = getTranslator(locale);
  return <div className="mt-6 overflow-x-auto">
    <table className="w-full text-left text-sm tabular-nums">
      <caption className="sr-only">{caption}</caption>
      <thead className="ds-spec-head">
        <tr>
          <th scope="col" className="py-3 pr-3 font-medium">{t("specs_display")}</th>
          <th scope="col" className="px-2 py-3 font-medium">Orientation</th>
          <th scope="col" className="py-3 pl-2 font-medium">Pixels</th>
        </tr>
      </thead>
      <tbody>
        {specs.map((spec) => <tr key={spec.id} className="border-t border-[var(--line)]">
          <th scope="row" className="py-3 pr-3 font-normal">
            {spec.slot === "duo-outer" ? t("specs_outer_display") : spec.slot === "duo-inner" ? t("specs_inner_display") : "iPhone"}
            <span className="block text-[var(--muted)]">{specRowDetail(spec, locale)}</span>
          </th>
          <td className="px-2 py-3">{spec.orientation === "portrait" ? "Portrait" : t("tool_orient_landscape")}</td>
          <td className="py-3 pl-2 font-mono">{screenshotDimensions(spec)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export function SpecsPage({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  const faq = SPECS_FAQ[locale];
  const outerSize = formatInches(SIZE_SPECS.find((spec) => spec.slot === "duo-outer")!.inches, locale);
  const innerSize = formatInches(SIZE_SPECS.find((spec) => spec.slot === "duo-inner")!.inches, locale);
  const size69 = formatInches(SIZE_SPECS.find((spec) => spec.slot === "iphone-69")!.inches, locale);
  return (
    <div className="flex min-h-full flex-col">
      <JsonLd locale={locale} faq={faq} />
      <SiteHeader locale={locale} path="/specs" />
      <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
        <p className="ds-label">{t("specs_dimensions_version")} · {SPECS_VERSION_DATE}</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl">{t("specs_iphone_duo_screenshot_sizes")}</h1>
        <p className="mt-4 max-w-3xl text-lg">
          {tf("specs_app_store_connect_prepare", { outerPortrait: OUTER_PORTRAIT, outerSize, innerPortrait: INNER_PORTRAIT, innerSize })}
        </p>
        <AppleAvailability locale={locale} />
        <section className="mt-10" aria-labelledby="duo-sizes">
          <h2 id="duo-sizes" className="font-display text-3xl">{t("specs_screenshot_dimensions_outer_inner")}</h2>
          <SpecsTable locale={locale} specs={SIZE_SPECS.filter((spec) => spec.slot !== "iphone-69")} caption={t("specs_iphone_duo_portrait_landscape")} />
          <p className="mt-4 text-sm text-[var(--muted)]">{t("specs_png_jpeg_without_alpha")}{" "}<a href={APPLE_SCREENSHOT_SOURCE} className="ds-link">{t("specs_read_connect_specifications")}</a></p>
        </section>
        <section className="mt-12" aria-labelledby="panel-vs-connect">
          <h2 id="panel-vs-connect" className="font-display text-3xl">{t("specs_panel_resolution_vs_app")}</h2>
          <p className="mt-4">{tf("specs_physical_inner_panel_has", { innerPortrait: INNER_PORTRAIT })}</p>
          <p className="mt-3 text-[var(--muted)]">{tf("specs_outer_display_panel_portrait", { outerPortrait: OUTER_PORTRAIT })}</p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><a className="ds-link" href={APPLE_DEVICE_SOURCE}>{tf("specs_apple_tech_specs_displays", { outerSize, innerSize })}</a><a className="ds-link" href={APPLE_SCREENSHOT_SOURCE}>{t("specs_apple_connect_screenshot_dimensions")}</a></p>
        </section>
        <section className="mt-12" aria-labelledby="iphone-69-sizes">
          <h2 id="iphone-69-sizes" className="font-display text-3xl">{tf("specs_additional_iphone_sizes", { size69 })}</h2>
          <p className="mt-4 text-[var(--muted)]">{tf("specs_these_formats_belong_iphone", { size69 })}</p>
          <SpecsTable locale={locale} specs={SIZE_SPECS.filter((spec) => spec.slot === "iphone-69")} caption={t("specs_iphone_6_9_inch")} />
        </section>
        <section className="mt-12">
          <h2 className="font-display text-3xl">{t("specs_iphone_duo_screenshot_questions")}</h2>
          <FaqList items={faq} />
        </section>
        <p className="mt-8 max-w-3xl text-sm text-[var(--muted)]">{appStoreDisclaimer233(locale)} {t("specs_duoshot_does_not_guarantee")}</p>
        <Link className="ds-cta mt-8" data-testid="specs-cta-tool" href={toolPath(locale)}>{t("specs_prepare_screenshots")}</Link>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
