import Link from "next/link";
import { getTranslator } from "@/lib/i18n";
import { localePrefix } from "@/lib/site";
import type { Locale } from "@/lib/specs";

export function TrustLine({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const prefix = localePrefix(locale);
  return (
    <p className="max-w-md text-xs leading-relaxed text-[var(--muted)]" data-testid="trust-line">
      {t("trust_retention")}{" "}
      <Link href={`${prefix}/privacy`} className="ds-link">
        {t("footer_privacy")}
      </Link>
      {" · "}
      {t("trust_no_guarantee")}
    </p>
  );
}
