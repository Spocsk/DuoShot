import type { Locale } from "@/lib/specs";
import { APPLE_SCREENSHOT_SOURCE, APPLE_UPLOAD_STATE, appleUploadStatus, type AppleUploadState } from "@/lib/apple-screenshot-status";
import { WaitlistForm } from "@/components/waitlist-form";
import { getTranslator } from "@/lib/i18n";

export function AppleAvailability({ locale, state = APPLE_UPLOAD_STATE }: { locale: Locale; state?: AppleUploadState }) {
  const { t } = getTranslator(locale);
  return <div data-testid="apple-availability" data-state={state} className="mt-4 max-w-3xl text-sm text-[var(--muted)]">
    <p>
      {appleUploadStatus(locale, state)}{" "}
      <a className="ds-link" href={APPLE_SCREENSHOT_SOURCE}>{t("specs_apple_specifications")}</a>
    </p>
    {state === "pending" ? (
      // inline-block follows the parent's text alignment: centered in the hero, start-aligned elsewhere.
      <div className="mt-3 inline-block w-full max-w-md text-left align-top">
        <WaitlistForm locale={locale} topic="apple_duo_open" compact />
      </div>
    ) : null}
  </div>;
}
