
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
import { sizeEnrichment } from "@/lib/size-enrichment";
import { APPLE_DEVICE_SOURCE, APPLE_SCREENSHOT_SOURCE } from "@/lib/apple-screenshot-status";
import { appStoreConnectGuide, ASC_GUIDE_PATH, sizesGuide, SIZES_GUIDE_PATH } from "@/lib/guides";
import { comparisonPath, competitorComparison } from "@/lib/comparisons";
import { ALTERNATIVES_BASE_PATH, ALTERNATIVES_HUB_COPY } from "@/lib/alternatives";
import { localizedPath, rejectionPath, toolPath } from "@/lib/site";
import { deviceGuidePath } from "@/lib/devices";
import { SCREENSHOT_CHECKER_PATH } from "@/lib/screenshot-checker";
import { directAnswer } from "@/lib/direct-answers";
import { DirectAnswer } from "./direct-answer";

export function SizePage({ locale, size }: { locale: Locale; size: ScreenshotSize }) {
  const { t, tf } = getTranslator(locale);
  const copy = sizePageCopy(locale, size);
  const path = `/${size}`;
  const answer = directAnswer(locale, size);
  const faq = sizeFaq(locale, size);
  const enrich = sizeEnrichment(locale, size);
  const guide = appStoreConnectGuide(locale);
  const status = size === "1206x2622" ? t("specs_required_iphone_sizes") : size === "1320x2868" ? t("size_status_optional") : t("size_status_duo");
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={path} faq={faq} article={{ ...copy, dateModified: SCREENSHOT_VERIFIED_ON, abstract: answer.text }} />
    <SiteHeader locale={locale} path={path} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <p className="ds-label">{tf("specs_verified_on", { date: SCREENSHOT_VERIFIED_ON })}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{copy.title}</h1>
      <DirectAnswer answer={answer} />
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
      {enrich.slots && <section className="mt-10" aria-labelledby="size-slots">
        <h2 id="size-slots" className="font-display text-3xl">{enrich.slots.heading}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {enrich.slots.columns.map((col) => <th key={col} scope="col" className="py-2 pr-4 align-bottom font-semibold">{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {enrich.slots.rows.map((row) => <tr key={row.group} className="border-b border-[var(--line)] align-top">
                <th scope="row" className="py-2 pr-4 font-normal">{row.group}</th>
                <td className="py-2 pr-4 font-mono">{row.sizes.map((part) => part.strong ? <strong key={part.text}>{part.text}</strong> : <span key={part.text}>{part.text}</span>)}</td>
                <td className="py-2">{row.status}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm"><a href={APPLE_SCREENSHOT_SOURCE} className="ds-link">{enrich.slots.source}</a></p>
        <p className="mt-2 text-sm text-[var(--muted)]">{enrich.slots.note}</p>
      </section>}
      {enrich.timeline && <section className="mt-10" aria-labelledby="size-timeline">
        <h2 id="size-timeline" className="font-display text-3xl">{enrich.timeline.heading}</h2>
        <p className="mt-4">{enrich.timeline.intro}</p>
        <div className="mt-4 space-y-4">
          {enrich.timeline.quotes.map((quote) => <blockquote key={quote.text} className="border-l-2 border-[var(--line)] pl-4">
            <p>“{quote.text}”</p>
            <cite className="ds-label mt-1 block not-italic">{quote.cite}</cite>
          </blockquote>)}
        </div>
        <p className="mt-4 text-sm"><a href={APPLE_SCREENSHOT_SOURCE} className="ds-link">{t("specs_read_connect_specifications")}</a></p>
      </section>}
      <section className="mt-10" aria-labelledby="size-devices">
        <h2 id="size-devices" className="font-display text-3xl">{enrich.devices.heading}</h2>
        <p className="mt-4">{enrich.devices.body}</p>
        <h3 className="font-display mt-6 text-xl">{enrich.orientation.heading}</h3>
        <p className="mt-2">{enrich.orientation.body}</p>
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
      <section className="mt-10" aria-labelledby="size-rejections">
        <h2 id="size-rejections" className="font-display text-3xl">{enrich.rejections.heading}</h2>
        <p className="mt-4">{enrich.rejections.intro}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {enrich.rejections.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
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
          <li><Link href={localizedPath(locale, ASC_GUIDE_PATH)} className="ds-link">{guide.title}</Link></li>
          <li><Link href={localizedPath(locale, SIZES_GUIDE_PATH)} className="ds-link">{sizesGuide(locale).title}</Link></li>
          <li><Link href={localizedPath(locale, comparisonPath("duoshot-vs-appscreens"))} className="ds-link">{competitorComparison(locale, "duoshot-vs-appscreens")!.title}</Link></li>
          <li><Link href={localizedPath(locale, ALTERNATIVES_BASE_PATH)} className="ds-link">{ALTERNATIVES_HUB_COPY[locale].title}</Link></li>
          {copy.related.map((related) => <li key={related}><Link href={localizedPath(locale, `/${related}`)} className="ds-link">{sizePageCopy(locale, related).title}</Link></li>)}
          {enrich.related && <>
            <li><Link href={localizedPath(locale, deviceGuidePath("iphone-duo"))} className="ds-link">{enrich.related.duoGuide}</Link></li>
            <li><Link href={localizedPath(locale, SCREENSHOT_CHECKER_PATH)} className="ds-link">{enrich.related.checker}</Link></li>
            <li><Link href={rejectionPath(locale)} className="ds-link">{enrich.related.rejection}</Link></li>
          </>}
        </ul>
      </section>
      <Button as="link" variant="primary" href={toolPath(locale)} className="mt-8">{t("specs_prepare_screenshots")}</Button>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
