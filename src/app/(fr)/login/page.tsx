import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/login",
  title: "Connexion",
  description: "Connexion DuoShot : Google, mot de passe ou lien magique.",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const { auth_error } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/login" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale="fr" mode="login" initialError={auth_error === "invalid_link"} />
      </main>
      <SiteFooter locale="fr" />
    </div>
  );
}
