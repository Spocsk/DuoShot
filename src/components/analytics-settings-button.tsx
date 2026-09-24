"use client";

import type { Locale } from "@/lib/specs";
import { analyticsConfigured } from "@/lib/analytics-client";

export function AnalyticsSettingsButton({ locale }: { locale: Locale }) {
  if (!analyticsConfigured()) return null;
  return <button type="button" className="hover:text-[var(--ink)]" onClick={() => window.dispatchEvent(new Event("duoshot:analytics-settings"))}>
    {locale === "fr" ? "Préférences statistiques" : "Analytics preferences"}
  </button>;
}
