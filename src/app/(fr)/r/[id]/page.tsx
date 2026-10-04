import { cookies, headers } from "next/headers";
import { I18nProvider } from "@/components/i18n-provider";
import { ReviewPage } from "@/components/review-page";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getMessages } from "@/lib/i18n";
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
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <ReviewPage
        id={id}
        locale={locale}
        demo={isDemoReview(id)}
        header={<SiteHeader locale={locale} path={reviewPath(locale, id)} />}
        footer={<SiteFooter locale={locale} />}
      />
    </I18nProvider>
  );
}
