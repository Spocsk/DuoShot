"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_COOKIE } from "@/lib/locale";
import type { Locale } from "@/lib/specs";

export function LocaleSwitch({ locale, href }: { locale: Locale; href: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const other: Locale = locale === "fr" ? "en" : "fr";

  function persist() {
    document.cookie = `${LOCALE_COOKIE}=${other}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <Link
      href={href}
      prefetch={false}
      hrefLang={other}
      data-testid="locale-switch"
      className="ds-nav-link relative z-[60] inline-flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.04em] uppercase"
      aria-label={other === "en" ? "Switch to English" : "Passer en français"}
      onClick={(event) => {
        persist();
        if (typeof window !== "undefined" && href === window.location.pathname) {
          event.preventDefault();
          router.refresh();
        }
      }}
    >
      <span aria-hidden="true" className="text-sm leading-none">{other === "en" ? "🇬🇧" : "🇫🇷"}</span>
      <span>{t("lang_switch")}</span>
    </Link>
  );
}
