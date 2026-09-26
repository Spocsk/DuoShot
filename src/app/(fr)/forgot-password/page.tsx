import { PasswordRecovery } from "@/components/password-recovery";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ locale: "fr", path: "/forgot-password", title: "Mot de passe oublié", description: "Mot de passe oublié · DuoShot" });
export default function Page() {
  return <div className="flex min-h-full flex-col">
    <SiteHeader locale="fr" path="/forgot-password" />
    <main id="main" className="px-5 py-16"><PasswordRecovery locale="fr" reset={false} /></main>
    <SiteFooter locale="fr" />
  </div>;
}
