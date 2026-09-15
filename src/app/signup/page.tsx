import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/signup",
  title: "Créer un compte",
  description: "Inscription DuoShot : Google, e-mail ou lien magique.",
});

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/signup" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale="fr" mode="signup" />
      </main>
      <SiteFooter locale="fr" />
    </div>
  );
}
