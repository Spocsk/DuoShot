import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { JsonLd } from "@/lib/json-ld";
import { getTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { SCREENSHOT_VERIFIED_ON, sizePageCopy, type ScreenshotSize } from "@/lib/screenshot-pages";
import { screenshotDimensions } from "@/lib/screenshot-copy";
import { APPLE_SCREENSHOT_SOURCE } from "@/lib/apple-screenshot-status";
import { localizedPath, toolPath } from "@/lib/site";

export function SizePage({ locale, size }: { locale: Locale; size: ScreenshotSize }) {
  const { t, tf } = getTranslator(locale);
  const copy = sizePageCopy(locale, size);
  const path = `/${size}`;
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={path} article={{ ...copy, dateModified: SCREENSHOT_VERIFIED_ON }} />
    <SiteHeader locale={locale} path={path} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <p className="ds-label">{tf("specs_verified_on", { date: SCREENSHOT_VERIFIED_ON })}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{copy.title}</h1>
      <p className="mt-4 text-lg">{copy.intro}</p>
      <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><dt className="ds-label">Portrait</dt><dd className="mt-2 font-mono text-xl">{screenshotDimensions(copy.portrait)} px</dd></div>
        <div><dt className="ds-label">{t("tool_orient_landscape")}</dt><dd className="mt-2 font-mono text-xl">{screenshotDimensions(copy.landscape)} px</dd></div>
      </dl>
      <section className="mt-10">
        <h2 className="font-display text-3xl">{t("size_file_heading")}</h2>
        <p className="mt-4">{t("size_file_body")}</p>
        {size === "2007x2853" && <p className="mt-4">{tf("specs_physical_inner_panel_has", { innerPortrait: screenshotDimensions(copy.portrait) })}</p>}
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">{t("size_slot_heading")}</h2>
        <p className="mt-4">{t("specs_single_slot")}</p>
        <a href={APPLE_SCREENSHOT_SOURCE} className="ds-link mt-4 inline-block">{t("specs_read_connect_specifications")}</a>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">{t("size_related_heading")}</h2>
        <ul className="mt-4 space-y-3">
          <li><Link href={localizedPath(locale, "/specs")} className="ds-link">{t("specs_iphone_duo_screenshot_sizes")}</Link></li>
          <li><Link href={localizedPath(locale, `/${copy.related}`)} className="ds-link">{sizePageCopy(locale, copy.related).title}</Link></li>
        </ul>
      </section>
      <Link href={toolPath(locale)} className="ds-cta mt-8">{t("specs_prepare_screenshots")}</Link>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
