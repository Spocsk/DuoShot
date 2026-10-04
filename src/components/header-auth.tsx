"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { localePrefix } from "@/lib/site";

export function HeaderAuth({
  locale,
  variant = "bar",
}: {
  locale: Locale;
  variant?: "bar" | "menu";
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
    return (
      <Link
        href={`${prefix}/account`}
        data-testid={variant === "menu" ? "nav-account-menu" : "nav-account"}
        className={variant === "menu" ? "ds-menu-link" : "ds-cta-ghost"}
      >
        {t("nav_account")}
      </Link>
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
      <Link href={`${prefix}/signup`} data-testid="nav-signup" className="ds-cta">
        {t("nav_signup")}
      </Link>
    </>
  );
}
