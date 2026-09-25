import { cookies, headers } from "next/headers";
import { ReviewPage } from "@/components/review-page";
import { LOCALE_COOKIE, cookieLocale, parseAcceptLanguage } from "@/lib/locale";
import { isDemoReview } from "@/lib/pipeline/harbor";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jar = await cookies();
  const locale =
    cookieLocale(jar.get(LOCALE_COOKIE)?.value) ?? parseAcceptLanguage((await headers()).get("accept-language"));
  return <ReviewPage id={id} locale={locale} demo={isDemoReview(id)} />;
}
