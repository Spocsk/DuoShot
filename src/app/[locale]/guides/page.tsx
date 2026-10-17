import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { COMPARISONS, competitorComparison, comparisonPath } from "@/lib/comparisons";
import { listGuides } from "@/lib/guides";
import { getTranslator } from "@/lib/i18n";
import { JsonLd } from "@/lib/json-ld";
import { SCREENSHOT_CHECKER_PATH } from "@/lib/screenshot-checker";
import { SCREENSHOT_SIZES, sizePageCopy, SPECS_PAGE_COPY } from "@/lib/screenshot-pages";
import { pageMetadata } from "@/lib/seo";
import { localizedPath } from "@/lib/site";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return pageMetadata({ locale, path: "/guides", title: t("guides_title"), description: t("guides_description") });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  const title = t("guides_title");
  const description = t("guides_description");
  const guides = listGuides(locale);
  const dateModified = guides.map((guide) => guide.dateModified).sort().at(-1)!;
  const sections = [
    { title: t("guides_guides"), links: guides },
    { title: t("guides_checker"), links: [{ path: SCREENSHOT_CHECKER_PATH, title: t("checker_title"), description: t("checker_description") }] },
    { title: t("guides_sizes"), links: [
      { path: "/specs", ...SPECS_PAGE_COPY[locale] },
      ...SCREENSHOT_SIZES.map((size) => ({ path: `/${size}`, ...sizePageCopy(locale, size) })),
    ] },
    { title: t("guides_comparisons"), links: COMPARISONS.map(({ slug }) => ({ path: comparisonPath(slug), ...competitorComparison(locale, slug)! })) },
  ];
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path="/guides" article={{ title, description, dateModified }} />
    <SiteHeader locale={locale} path="/guides" />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-[var(--muted)]">{description}</p>
      {sections.map((section) => <section key={section.title} className="mt-10">
        <h2 className="font-display text-3xl">{section.title}</h2>
        <ul className="mt-4 space-y-6">
          {section.links.map((link) => <li key={link.path}>
            <Link href={localizedPath(locale, link.path)} className="ds-link">{link.title}</Link>
            <p className="mt-1 text-[var(--muted)]">{link.description}</p>
          </li>)}
        </ul>
      </section>)}
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
