import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GuideMarkdown } from "@/components/guide-markdown";
import { guidelinesGuide, GUIDELINES_GUIDE_PATH } from "@/lib/guides";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: GUIDELINES_GUIDE_PATH, ...guidelinesGuide(locale) });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const guide = guidelinesGuide(locale);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={GUIDELINES_GUIDE_PATH} article={{ ...guide, author: "person" }} />
    <SiteHeader locale={locale} path={GUIDELINES_GUIDE_PATH} />
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
      <article><GuideMarkdown body={guide.body} /></article>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
