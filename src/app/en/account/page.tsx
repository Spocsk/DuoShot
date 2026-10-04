import { AccountApp } from "@/components/account-app";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/account",
  title: "Account",
  description: "DuoShot account: plans, JSON export, deletion.",
});


export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="en" path="/account" />
      <MessagesScope locale="en" scope="app">
        <AccountApp locale="en" />
      </MessagesScope>
      <SiteFooter locale="en" />
    </div>
  );
}
