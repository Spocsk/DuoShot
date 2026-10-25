
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/lib/json-ld";
import { getTranslator } from "@/lib/i18n";
import { MAX_IMAGES, type Locale } from "@/lib/specs";
import { aspectRatio, SCREENSHOT_VERIFIED_ON, sizePageCopy, type ScreenshotSize } from "@/lib/screenshot-pages";
import { screenshotDimensions } from "@/lib/screenshot-copy";
import { sizeFaq } from "@/lib/size-faq";
import { APPLE_DEVICE_SOURCE, APPLE_SCREENSHOT_SOURCE } from "@/lib/apple-screenshot-status";
import { localizedPath, toolPath } from "@/lib/site";
import { directAnswer } from "@/lib/direct-answers";
import { DirectAnswer } from "./direct-answer";

export function SizePage({ locale, size }: { locale: Locale; size: ScreenshotSize }) {
  const { t, tf } = getTranslator(locale);
  const copy = sizePageCopy(locale, size);
  const path = `/${size}`;
  const answer = size === "1398x2034" || size === "2007x2853" ? directAnswer(locale, size) : undefined;
  const faq = sizeFaq(locale, size);
  const status = size === "1206x2622" ? t("specs_required_iphone_sizes") : size === "1320x2868" ? t("size_status_optional") : t("size_status_duo");
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={path} faq={faq} article={{ ...copy, dateModified: SCREENSHOT_VERIFIED_ON, abstract: answer?.text }} />
    <SiteHeader locale={locale} path={path} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <p className="ds-label">{tf("specs_verified_on", { date: SCREENSHOT_VERIFIED_ON })}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{copy.title}</h1>
      {answer && <DirectAnswer answer={answer} />}
      <p className="mt-4 text-lg">{copy.intro}</p>
      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6" aria-labelledby="size-summary">
        <h2 id="size-summary" className="font-display text-2xl">{t("size_summary_heading")}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div><dt className="ds-label">Portrait</dt><dd className="font-mono text-lg">{screenshotDimensions(copy.portrait)} px</dd></div>
          <div><dt className="ds-label">{t("tool_orient_landscape")}</dt><dd className="font-mono text-lg">{screenshotDimensions(copy.landscape)} px</dd></div>
          <div><dt className="ds-label">{t("size_summary_ratio")}</dt><dd className="font-mono text-lg">{aspectRatio(copy.portrait.width, copy.portrait.height, locale)}</dd></div>
          <div><dt className="ds-label">{t("size_summary_count")}</dt><dd>{tf("size_summary_count_detail", { max: MAX_IMAGES })}</dd></div>
          <div className="sm:col-span-2"><dt className="ds-label">{t("size_summary_status")}</dt><dd>{status}</dd></div>
          <div><dt className="ds-label">{t("size_summary_verified")}</dt><dd className="font-mono">{SCREENSHOT_VERIFIED_ON}</dd></div>
        </dl>
        <a href={APPLE_SCREENSHOT_SOURCE} className="ds-link mt-4 inline-block">{t("specs_read_connect_specifications")}</a>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">{t("size_file_heading")}</h2>
        <p className="mt-4">{t("size_file_body")}</p>
        {size === "2007x2853" && <>
          <p className="mt-4">{tf("specs_physical_inner_panel_has", { innerPortrait: screenshotDimensions(copy.portrait) })}</p>
          <a href={APPLE_DEVICE_SOURCE} className="ds-link mt-2 inline-block">{t("specs_apple_tech_specs_displays")}</a>
        </>}
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">{t(size === "1320x2868" ? "specs_optional_iphone_sizes" : size === "1206x2622" ? "specs_required_iphone_sizes" : "size_slot_heading")}</h2>
        <p className="mt-4">{t(size === "1320x2868" ? "specs_iphone_69_body" : size === "1206x2622" ? "specs_iphone_63_body" : "specs_single_slot")}</p>
        <a href={APPLE_SCREENSHOT_SOURCE} className="ds-link mt-4 inline-block">{t("specs_read_connect_specifications")}</a>
      </section>
      <section className="mt-10" aria-labelledby="size-faq">
        <h2 id="size-faq" className="font-display text-3xl">{t("faq_title")}</h2>
        <FaqList items={faq} />
        {size === "2007x2853" && <p className="mt-4 text-sm"><a href={APPLE_DEVICE_SOURCE} className="ds-link">{t("specs_apple_tech_specs_displays")}</a></p>}
      </section>
      <section className="mt-10">
        <h2 className="font-display text-3xl">{t("size_related_heading")}</h2>
        <ul className="mt-4 space-y-3">
          <li><Link href={localizedPath(locale, "/specs")} className="ds-link">{t("specs_iphone_duo_screenshot_sizes")}</Link></li>
          {copy.related.map((related) => <li key={related}><Link href={localizedPath(locale, `/${related}`)} className="ds-link">{sizePageCopy(locale, related).title}</Link></li>)}
        </ul>
      </section>
      <Button as="link" variant="primary" href={toolPath(locale)} className="mt-8">{t("specs_prepare_screenshots")}</Button>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
