import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/login",
  title: "Log in",
  description: "Log in to DuoShot: Google, password or magic link.",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const { auth_error } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="en" path="/login" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale="en" mode="login" initialError={auth_error === "invalid_link"} />
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
