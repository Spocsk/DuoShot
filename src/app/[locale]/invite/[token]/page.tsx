import { InviteAccept } from "@/components/invite-accept";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { localePrefix } from "@/lib/site";
import { pageLocale } from "../../params";

export const metadata = { robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await pageLocale(params);
  const { token } = await params;
  return (
    <MessagesScope locale={locale} scope="app">
      <div className="flex min-h-full flex-col">
        <SiteHeader locale={locale} path={`${localePrefix(locale)}/invite/${token}`} />
        <InviteAccept token={token} locale={locale} />
        <SiteFooter locale={locale} />
      </div>
    </MessagesScope>
  );
}
