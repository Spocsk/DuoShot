import { WhyNotAiPage } from "@/components/why-not-ai-page";
import { pageMetadata } from "@/lib/seo";
import { WHY_NOT_AI_PAGE_COPY } from "@/lib/marketing-copy";
import { pageLocale, type LocaleParams } from "../params";

// English slug of /pourquoi-pas-ia (same page, localized URL).

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params, "en");
  return pageMetadata({
    locale,
    path: "/pourquoi-pas-ia",
    ...WHY_NOT_AI_PAGE_COPY[locale],
  });
}

export default async function Page({ params }: LocaleParams) {
  return <WhyNotAiPage locale={await pageLocale(params, "en")} />;
}
