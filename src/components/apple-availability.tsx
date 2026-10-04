import type { Locale } from "@/lib/specs";
import { APPLE_SCREENSHOT_SOURCE, APPLE_UPLOAD_STATE, appleUploadStatus, type AppleUploadState } from "@/lib/apple-screenshot-status";
import { WaitlistForm } from "@/components/waitlist-form";

export function AppleAvailability({ locale, state = APPLE_UPLOAD_STATE }: { locale: Locale; state?: AppleUploadState }) {
  return <div data-testid="apple-availability" data-state={state} className="mt-4 max-w-3xl text-sm text-[var(--muted)]">
    <p>
      {appleUploadStatus(locale, state)}{" "}
      <a className="ds-link" href={APPLE_SCREENSHOT_SOURCE}>{locale === "fr" ? "Spécifications Apple" : "Apple specifications"}</a>
    </p>
    {state === "pending" ? <WaitlistForm locale={locale} topic="apple_duo_open" className="mt-3 max-w-xl" /> : null}
  </div>;
}
