"use client";

import { analyticsConfigured } from "@/lib/analytics-client";
import { useI18n } from "@/components/i18n-provider";

export function AnalyticsSettingsButton() {
  const { t } = useI18n();
  if (!analyticsConfigured()) return null;
  return <button type="button" className="hover:text-[var(--studio-ink)]" onClick={() => window.dispatchEvent(new Event("duoshot:analytics-settings"))}>
    {t("footer_analytics_preferences")}
  </button>;
}
