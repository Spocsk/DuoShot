import Link from "next/link";
import { t } from "@/lib/i18n";
import { localePrefix } from "@/lib/site";
import type { Locale } from "@/lib/specs";

export function TrustLine({ locale }: { locale: Locale }) {
  const prefix = localePrefix(locale);
  return (
    <p className="max-w-md text-xs leading-relaxed text-[var(--muted)]" data-testid="trust-line">
      {t(locale, "trust_retention")}{" "}
      <Link href={`${prefix}/privacy`} className="ds-link">
        {t(locale, "footer_privacy")}
      </Link>
      {" · "}
      {t(locale, "trust_no_guarantee")}
    </p>
  );
}
