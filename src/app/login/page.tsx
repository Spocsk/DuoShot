import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/login",
  title: "Connexion",
  description: "Connexion DuoShot : Google, mot de passe ou lien magique.",
});

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/login" />
      <main className="px-5 py-16">
        <AuthForm locale="fr" mode="login" />
      </main>
      <SiteFooter locale="fr" />
    </div>
  );
}
