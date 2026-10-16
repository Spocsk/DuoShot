import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GuideMarkdown } from "@/components/guide-markdown";
import { COMPARISONS, competitorComparison, comparisonPath } from "@/lib/comparisons";
import { JsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/seo";
import { pageLocale } from "../../params";

type ComparisonParams = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return COMPARISONS.map(({ slug }) => ({ slug }));
}

async function comparison(params: ComparisonParams["params"]) {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const guide = competitorComparison(locale, slug);
  if (!guide) notFound();
  return { locale, path: comparisonPath(slug), guide };
}

export async function generateMetadata({ params }: ComparisonParams) {
  const { locale, path, guide } = await comparison(params);
  return pageMetadata({ locale, path, ...guide });
}

export default async function Page({ params }: ComparisonParams) {
  const { locale, path, guide } = await comparison(params);
  return <div className="flex min-h-full flex-col">
    <JsonLd locale={locale} path={path} article={guide} />
    <SiteHeader locale={locale} path={path} />
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
      <article><GuideMarkdown body={guide.body} /></article>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
