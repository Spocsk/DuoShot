"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { analyticsPath } from "@/lib/analytics-path";
import {
  analyticsChoice, analyticsConfigured, identifyAnalyticsUser, resetAnalyticsUser,
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

async function reportAuthIfPending(userId: string) {
  await identifyAnalyticsUser(userId);
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
  const fr = !pathname?.startsWith("/en");

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
      reportAuthIfPending(data.user.id);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetAnalyticsUser();
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        const current = analyticsChoice();
        if (current) void syncAccountChoice(session.user.id, current);
        reportAuthIfPending(session.user.id);
      }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [configured, ready]);

  useEffect(() => {
    if (!configured || !ready || choice !== "accepted") return;
    const page = analyticsPath(pathname ?? "");
    if (!page) return;
    const locale = fr ? "fr" : "en";
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
  }, [choice, configured, fr, pathname, ready]);

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
      if (next === "accepted") await identifyAnalyticsUser(data.user.id);
    }
    setSettingsOpen(false);
  }

  return (
    <>
      {configured && ready && (choice === null || settingsOpen) ? (
        <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-xl border border-[var(--line)] bg-[var(--background)] p-5 shadow-2xl" role="dialog" aria-label={fr ? "Préférences statistiques" : "Analytics preferences"}>
          <p className="font-display text-lg">{fr ? "Mesure des parcours" : "Product analytics"}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{fr
            ? "Avec votre accord, Mixpanel mesure les pages consultées, le temps visible et les étapes de création, sans recevoir vos captures ni votre adresse e-mail."
            : "With your permission, Mixpanel measures pages, visible time and creation steps, without receiving your screenshots or email address."}</p>
          {choiceError ? <p className="mt-2 text-sm text-[var(--warn)]" role="alert">{fr ? "Choix non enregistré. Réessayez." : "Preference not saved. Please retry."}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="ds-cta" onClick={() => void choose("accepted")}>{fr ? "Accepter" : "Accept"}</button>
            <button type="button" className="ds-cta-ghost" onClick={() => void choose("rejected")}>{fr ? "Refuser" : "Decline"}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
