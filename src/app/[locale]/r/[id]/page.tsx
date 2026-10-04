import { cookies, headers } from "next/headers";
import { MessagesScope } from "@/components/messages-scope";
import { ReviewPage } from "@/components/review-page";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LOCALE_COOKIE, cookieLocale, parseAcceptLanguage } from "@/lib/locale";
import { isDemoReview } from "@/lib/pipeline/harbor";
import { reviewPath } from "@/lib/site";
import type { Locale } from "@/lib/specs";
import { pageLocale } from "../../params";

export const metadata = { robots: { index: false, follow: false } };

/** /en/r/… is English; the unprefixed review link follows the reader's saved choice or browser language. */
async function readerLocale(routeLocale: Locale): Promise<Locale> {
  if (routeLocale === "en") return "en";
  const jar = await cookies();
  return cookieLocale(jar.get(LOCALE_COOKIE)?.value) ?? parseAcceptLanguage((await headers()).get("accept-language"));
}

export default async function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const locale = await readerLocale(await pageLocale(params));
  return (
    <MessagesScope locale={locale} scope="app">
      <ReviewPage
        id={id}
        locale={locale}
        demo={isDemoReview(id)}
        header={<SiteHeader locale={locale} path={reviewPath(locale, id)} />}
        footer={<SiteFooter locale={locale} />}
      />
    </MessagesScope>
  );
}
