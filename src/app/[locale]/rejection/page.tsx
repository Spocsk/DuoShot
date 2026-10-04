import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";
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
    title: "App Store screenshot errors: dimensions & alpha channel",
    description: "Fix wrong screenshot dimensions, “image dimensions are not valid”, and alpha channel issues. Check iPhone Duo sizes before preparing your files.",
  });
}

export default async function Page({ params }: LocaleParams) {
  return <RejectionPage locale={await pageLocale(params, "en")} />;
}
