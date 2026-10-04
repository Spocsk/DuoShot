export const metadata = { robots: { index: false, follow: false } };
import { InviteAccept } from "@/components/invite-accept";
import { MessagesScope } from "@/components/messages-scope";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <MessagesScope locale="en" scope="app">
      <InviteAccept token={token} locale="en" />
    </MessagesScope>
  );
}
