import { connection } from "next/server";
import { HomePage } from "@/components/home-page";
import { checkoutDisplayAvailable, passCheckoutAvailable } from "@/lib/billing-availability";
import { pageMetadata } from "@/lib/seo";
import { HOME_PAGE_COPY } from "@/lib/marketing-copy";
import { pageLocale, type LocaleParams } from "./params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/", ...HOME_PAGE_COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  // Read runtime billing configuration so the first HTML has the current offers.
  await connection();
  return <HomePage locale={locale} checkoutAvailable={checkoutDisplayAvailable()} passAvailable={passCheckoutAvailable()} />;
}
