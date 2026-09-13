"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Locale } from "@/lib/specs";

export function LocaleSwitch({ locale, href }: { locale: Locale; href: string }) {
  const other: Locale = locale === "fr" ? "en" : "fr";

  function persist() {
    document.cookie = `${LOCALE_COOKIE}=${other}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <Link
      href={href}
      hrefLang={other}
      className="uppercase tracking-wider hover:text-[var(--foreground)]"
      onClick={persist}
    >
      {t(locale, "lang_switch")}
    </Link>
  );
}
