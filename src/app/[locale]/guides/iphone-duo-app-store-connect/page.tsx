import { FaqList } from "@/components/faq-list";
import { GuideMarkdown } from "@/components/guide-markdown";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ascGuideCopy } from "@/lib/asc-guide-copy";
import { appStoreConnectGuide, ASC_GUIDE_PATH } from "@/lib/guides";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: ASC_GUIDE_PATH, ...appStoreConnectGuide(locale) });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const guide = appStoreConnectGuide(locale);
  const copy = ascGuideCopy(locale);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={ASC_GUIDE_PATH} article={guide} faq={copy.faq} howTo={{ name: copy.howToHeading, steps: copy.steps }} />
    <SiteHeader locale={locale} path={ASC_GUIDE_PATH} />
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
      <article>
        <GuideMarkdown body={guide.body} />
        <section className="mt-12" aria-labelledby="howto">
          <h2 id="howto" className="font-display text-3xl">{copy.howToHeading}</h2>
          <ol className="mt-6 max-w-3xl list-decimal space-y-6 pl-6">
            {copy.steps.map((step) => <li key={step.id} id={step.id}>
              <h3 className="font-display text-2xl">{step.name}</h3>
              <p className="mt-3 leading-relaxed">{step.text}</p>
            </li>)}
          </ol>
        </section>
        <section className="mt-12" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-3xl">{copy.faqHeading}</h2>
          <FaqList items={copy.faq} />
        </section>
      </article>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
