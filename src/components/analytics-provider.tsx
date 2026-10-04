"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n-provider";
import { analyticsPath } from "@/lib/analytics-path";
import {
  analyticsChoice, analyticsConfigured, refreshAnalyticsAudience, resetAnalyticsUser,
  setAnalyticsChoice, trackProduct, consumeAnalyticsAuthIntent, type AnalyticsChoice,
} from "@/lib/analytics-client";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { POLICY_VERSION } from "@/lib/specs";

const SYNC_KEY = "duoshot_analytics_synced_v1";

function subscribeChoice(callback: () => void) {
  window.addEventListener("duoshot:analytics-choice", callback);
  return () => window.removeEventListener("duoshot:analytics-choice", callback);
}

function subscribeNever() { return () => {}; }

async function syncAccountChoice(userId: string, choice: Exclude<AnalyticsChoice, null>): Promise<boolean> {
  const marker = `${userId}:${choice}`;
  try { if (localStorage.getItem(SYNC_KEY) === marker) return true; } catch { /* retry */ }
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("consent_events").insert({
    user_id: userId, kind: "analytics", accepted: choice === "accepted", policy_version: POLICY_VERSION,
  });
  if (!error) {
    try { localStorage.setItem(SYNC_KEY, marker); } catch { /* no persistence */ }
  }
  return !error;
}

async function reportAuthIfPending() {
  await refreshAnalyticsAudience();
  const method = consumeAnalyticsAuthIntent();
  if (method && analyticsChoice() === "accepted") {
    void trackProduct("auth_succeeded", { method });
  }
}

export function AnalyticsProvider() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeChoice, analyticsChoice, () => null);
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choiceError, setChoiceError] = useState(false);
  const configured = analyticsConfigured();
  const { locale, t } = useI18n();

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener("duoshot:analytics-settings", open);
    return () => {
      window.removeEventListener("duoshot:analytics-settings", open);
    };
  }, []);

  useEffect(() => {
    if (!configured || !ready) return;
    const supabase = createBrowserSupabase();
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const current = analyticsChoice();
      if (current) void syncAccountChoice(data.user.id, current);
      reportAuthIfPending();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetAnalyticsUser();
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        const current = analyticsChoice();
        if (current) void syncAccountChoice(session.user.id, current);
        reportAuthIfPending();
      }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [configured, ready]);

  useEffect(() => {
    if (!configured || !ready || choice !== "accepted") return;
    const page = analyticsPath(pathname ?? "");
    if (!page) return;
    void trackProduct("page_viewed", { page, locale });
    let visibleAt = document.visibilityState === "visible" ? Date.now() : null;
    const flush = () => {
      if (visibleAt === null) return;
      const seconds = Math.floor((Date.now() - visibleAt) / 1000);
      visibleAt = document.visibilityState === "visible" ? Date.now() : null;
      if (seconds > 0) void trackProduct("page_engagement", { page, locale, seconds });
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
      else visibleAt = Date.now();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    const interval = window.setInterval(flush, 30_000);
    return () => {
      flush();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [choice, configured, locale, pathname, ready]);

  async function choose(next: "accepted" | "rejected") {
    setChoiceError(false);
    if (!(await setAnalyticsChoice(next))) {
      setChoiceError(true);
      return;
    }
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const saved = await syncAccountChoice(data.user.id, next);
      if (!saved) {
        setChoiceError(true);
        setSettingsOpen(true);
        return;
      }
      if (next === "accepted") await refreshAnalyticsAudience();
    }
    setSettingsOpen(false);
  }

  return (
    <>
      {configured && ready && (choice === null || settingsOpen) ? (
        <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 shadow-xl sm:flex-row sm:items-center sm:gap-5" role="dialog" aria-label={t("footer_analytics_preferences")}>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-snug text-[var(--muted)] sm:text-sm"><strong className="font-semibold text-[var(--foreground)]">{t("consent_product_analytics")}</strong>{t("consent_permission_datafast_measures_pages")}</p>
            {choiceError ? <p className="mt-1 text-xs text-[var(--warn)] sm:text-sm" role="alert">{t("consent_preference_not_saved_please")}</p> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className="ds-cta flex-1 sm:flex-none" onClick={() => void choose("accepted")}>{t("account_accept")}</button>
            <button type="button" className="ds-cta-ghost flex-1 sm:flex-none" onClick={() => void choose("rejected")}>{t("consent_decline")}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
