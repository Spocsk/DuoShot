import { InviteAccept } from "@/components/invite-accept";
import { MessagesScope } from "@/components/messages-scope";
import { pageLocale } from "../../params";

export const metadata = { robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await pageLocale(params);
  const { token } = await params;
  return (
    <MessagesScope locale={locale} scope="app">
      <InviteAccept token={token} locale={locale} />
    </MessagesScope>
  );
}
