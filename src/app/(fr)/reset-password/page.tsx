import { PasswordRecovery } from "@/components/password-recovery";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ locale: "fr", path: "/reset-password", title: "Nouveau mot de passe", description: "Nouveau mot de passe · DuoShot" });
export default function Page() {
  return <div className="flex min-h-full flex-col">
    <SiteHeader locale="fr" path="/reset-password" />
    <main id="main" className="px-5 py-16"><PasswordRecovery locale="fr" reset={true} /></main>
    <SiteFooter locale="fr" />
  </div>;
}
