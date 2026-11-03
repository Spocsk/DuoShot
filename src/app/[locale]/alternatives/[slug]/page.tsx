import { notFound } from "next/navigation";
import { AlternativePage } from "@/components/alternative-page";
import { ALTERNATIVE_SLUGS, alternativePage, alternativePath } from "@/lib/alternatives";
import { pageMetadata } from "@/lib/seo";
import { pageLocale } from "../../params";

export const dynamicParams = false;

type AlternativeParams = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return ALTERNATIVE_SLUGS.map((slug) => ({ slug }));
}

async function resolve(params: AlternativeParams["params"]) {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const data = alternativePage(locale, slug);
  if (!data) notFound();
  return { locale, slug, data };
}

export async function generateMetadata({ params }: AlternativeParams) {
  const { locale, slug, data } = await resolve(params);
  return pageMetadata({ locale, path: alternativePath(slug), title: data.title, description: data.description });
}

export default async function Page({ params }: AlternativeParams) {
  const { locale, data } = await resolve(params);
  return <AlternativePage locale={locale} data={data} />;
}
