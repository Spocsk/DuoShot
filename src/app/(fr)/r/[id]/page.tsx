import { cookies, headers } from "next/headers";
import { MessagesScope } from "@/components/messages-scope";
import { ReviewPage } from "@/components/review-page";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LOCALE_COOKIE, cookieLocale, parseAcceptLanguage } from "@/lib/locale";
import { isDemoReview } from "@/lib/pipeline/harbor";
import { reviewPath } from "@/lib/site";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const locale =
    cookieLocale(jar.get(LOCALE_COOKIE)?.value) ?? parseAcceptLanguage((await headers()).get("accept-language"));
  // The unprefixed review link serves the reader's language, so it overrides the French layout's messages.
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
