import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GuideMarkdown } from "@/components/guide-markdown";
import { appPreviewGuide, APP_PREVIEW_GUIDE_PATH } from "@/lib/guides";
import { APPLE_APP_PREVIEW_SOURCE } from "@/lib/apple-screenshot-status";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: APP_PREVIEW_GUIDE_PATH, ...appPreviewGuide(locale) });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const guide = appPreviewGuide(locale);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={APP_PREVIEW_GUIDE_PATH} article={{ ...guide, author: "person", citation: APPLE_APP_PREVIEW_SOURCE }} />
    <SiteHeader locale={locale} path={APP_PREVIEW_GUIDE_PATH} />
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
      <article><GuideMarkdown body={guide.body} /></article>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
