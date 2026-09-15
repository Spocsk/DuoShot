"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Locale } from "@/lib/specs";

export function LocaleSwitch({ locale, href }: { locale: Locale; href: string }) {
  const router = useRouter();
  const other: Locale = locale === "fr" ? "en" : "fr";

  function persist() {
    document.cookie = `${LOCALE_COOKIE}=${other}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <Link
      href={href}
      hrefLang={other}
      data-testid="locale-switch"
      className="ds-nav-link relative z-[60] font-mono text-xs tracking-[0.16em] uppercase"
      onClick={(event) => {
        persist();
        if (typeof window !== "undefined" && href === window.location.pathname) {
          event.preventDefault();
          router.refresh();
        }
      }}
    >
      {t(locale, "lang_switch")}
    </Link>
  );
}
