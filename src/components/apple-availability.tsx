import type { Locale } from "@/lib/specs";
import { APPLE_SCREENSHOT_SOURCE, appleUploadStatus } from "@/lib/apple-screenshot-status";

export function AppleAvailability({ locale }: { locale: Locale }) {
  return <p data-testid="apple-availability" className="mt-4 max-w-3xl text-sm text-[var(--muted)]">
    {appleUploadStatus(locale)}{" "}
    <a className="ds-link" href={APPLE_SCREENSHOT_SOURCE}>{locale === "fr" ? "Spécifications Apple" : "Apple specifications"}</a>
  </p>;
}
