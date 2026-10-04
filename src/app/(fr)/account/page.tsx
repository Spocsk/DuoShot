import { AccountApp } from "@/components/account-app";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/account",
  title: "Compte",
  description: "Compte DuoShot : offres, export JSON, suppression.",
});


export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/account" />
      <MessagesScope locale="fr" scope="app">
        <AccountApp locale="fr" />
      </MessagesScope>
      <SiteFooter locale="fr" />
    </div>
  );
}
