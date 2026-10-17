import { SizePage } from "@/components/size-page";
import { pageMetadata } from "@/lib/seo";
import { sizePageCopy } from "@/lib/screenshot-pages";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/1206x2622", ...sizePageCopy(locale, "1206x2622") });
}

export default async function Page({ params }: LocaleParams) {
  return <SizePage locale={await pageLocale(params)} size="1206x2622" />;
}
