import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { safeNextPath } from "@/lib/auth-redirect";

export const metadata = pageMetadata({
  locale: "en",
  path: "/signup",
  title: "Sign up",
  description: "Create a DuoShot account: Google, email or magic link.",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="en" path="/signup" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale="en" mode="signup" nextPath={safeNextPath(next)} />
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
