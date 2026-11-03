import { CALL_BOOKING_URL } from "@/lib/call-offer";
import { getTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { Button } from "@/components/ui/button";

/** Only https links are rendered; anything else (or an unparseable value) is treated as unset. */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Reusable "book a 15-min call = 7 days of Pro free" card. Server component: it reads the
 * current locale's copy through getTranslator and renders nothing when CALL_BOOKING_URL is
 * empty or not an https URL, so pages stay unchanged until the booking link is configured.
 */
export function CallCtaCard({ locale, className }: { locale: Locale; className?: string }) {
  if (!CALL_BOOKING_URL || !isHttpsUrl(CALL_BOOKING_URL)) return null;
  const { t } = getTranslator(locale);
  return (
    <section className={["mx-auto w-full max-w-2xl px-5 py-12", className].filter(Boolean).join(" ")} data-testid="call-cta">
      <aside className="studio-plan is-featured">
        <div className="studio-plan-title">
          <h2>{t("call_offer_title")}</h2>
        </div>
        <p className="studio-plan-body">{t("call_offer_body")}</p>
        <div className="studio-plan-cta">
          <Button as="a" variant="primary" href={CALL_BOOKING_URL} target="_blank" rel="noopener noreferrer">
            {t("call_offer_cta")}
          </Button>
        </div>
      </aside>
    </section>
  );
}
