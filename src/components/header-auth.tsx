"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
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
    return <span className="inline-block h-8 w-20" />;
  }

  if (signedIn) {
    return (
      <Link
        href={`${prefix}/account`}
        className={variant === "menu" ? "ds-menu-link" : "ds-cta !px-3 !py-1.5 text-sm"}
      >
        {t(locale, "nav_account")}
      </Link>
    );
  }

  if (variant === "menu") {
    return (
      <>
        <Link href={`${prefix}/login`} className="ds-menu-link">
          {t(locale, "nav_login")}
        </Link>
        <Link href={`${prefix}/signup`} className="ds-menu-link">
          {t(locale, "nav_signup")}
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={`${prefix}/login`} className="hover:text-[var(--foreground)]">
        {t(locale, "nav_login")}
      </Link>
      <Link href={`${prefix}/signup`} className="ds-cta !px-3 !py-1.5 text-sm">
        {t(locale, "nav_signup")}
      </Link>
    </>
  );
}
