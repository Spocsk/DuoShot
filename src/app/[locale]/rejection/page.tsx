import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";
import { REJECTION_PAGE_COPY } from "@/lib/marketing-copy";
import { pageLocale, type LocaleParams } from "../params";

// English slug of /rejet (same page, localized URL).

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params, "en");
  return pageMetadata({
    locale,
    path: "/rejet",
    ...REJECTION_PAGE_COPY[locale],
  });
}

export default async function Page({ params }: LocaleParams) {
  return <RejectionPage locale={await pageLocale(params, "en")} />;
}
