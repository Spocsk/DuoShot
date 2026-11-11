import { FaqList } from "@/components/faq-list";
import { GuideMarkdown } from "@/components/guide-markdown";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { creativeAssetsGuide, CREATIVE_ASSETS_GUIDE_PATH } from "@/lib/guides";
import { APPLE_CREATIVE_ASSETS_SOURCE } from "@/lib/apple-screenshot-status";
import { creativeAssetsGuideCopy } from "@/lib/creative-assets-guide-copy";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: CREATIVE_ASSETS_GUIDE_PATH, ...creativeAssetsGuide(locale) });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const guide = creativeAssetsGuide(locale);
  const copy = creativeAssetsGuideCopy(locale);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={CREATIVE_ASSETS_GUIDE_PATH} article={{ ...guide, author: "person", citation: APPLE_CREATIVE_ASSETS_SOURCE }} faq={copy.faq} />
    <SiteHeader locale={locale} path={CREATIVE_ASSETS_GUIDE_PATH} />
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
      <article>
        <GuideMarkdown body={guide.body} />
        <section className="mt-12" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-3xl">{copy.faqHeading}</h2>
          <FaqList items={copy.faq} />
        </section>
      </article>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
