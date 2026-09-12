import { AccountApp } from "@/components/account-app";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/account",
  title: "Compte",
  description: "Compte DuoShot : offres, export JSON, suppression.",
});

export const robots = { index: false, follow: false };

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/account" />
      <AccountApp locale="fr" />
      <SiteFooter locale="fr" />
    </div>
  );
}
