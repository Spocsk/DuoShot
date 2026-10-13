"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { localePrefix } from "@/lib/site";

export function HeaderAuth({
  locale,
  variant = "bar",
  secondarySignup = false,
}: {
  locale: Locale;
  variant?: "bar" | "menu";
  secondarySignup?: boolean;
}) {
  const { t } = useI18n();
  const prefix = localePrefix(locale);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (signedIn === null) {
    return <span className="inline-block h-[var(--target)] w-20" />;
  }

  if (signedIn) {
    return variant === "menu" ? (
      <Link href={`${prefix}/account`} data-testid="nav-account-menu" className="ds-menu-link">{t("nav_account")}</Link>
    ) : (
      <Button as="link" variant="secondary" href={`${prefix}/account`} data-testid="nav-account">{t("nav_account")}</Button>
    );
  }

  if (variant === "menu") {
    return (
      <>
        <Link href={`${prefix}/login`} data-testid="nav-login-menu" className="ds-menu-link">
          {t("nav_login")}
        </Link>
        <Link href={`${prefix}/signup`} data-testid="nav-signup-menu" className="ds-menu-link">
          {t("nav_signup")}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={`${prefix}/login`} data-testid="nav-login" className="ds-nav-link">
        {t("nav_login")}
      </Link>
      <Button as="link" variant={secondarySignup ? "secondary" : "primary"} href={`${prefix}/signup`} data-testid="nav-signup">
        {t("nav_signup")}
      </Button>
    </>
  );
}
