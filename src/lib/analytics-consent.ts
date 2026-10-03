export type AnalyticsChoice = "accepted" | "rejected" | null;
export const ANALYTICS_CHOICE_KEY = "duoshot_analytics_choice_v2";

export function analyticsChoice(): AnalyticsChoice {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CHOICE_KEY);
    if (value === "accepted" || value === "rejected") return value;
    // Keep an existing refusal. Adding a provider requires a fresh acceptance.
    return window.localStorage.getItem("duoshot_analytics_choice_v1") === "rejected" ? "rejected" : null;
  } catch {
    return null;
  }
}

export function syncAnalyticsConsentCookie(choice: AnalyticsChoice) {
  if (typeof document === "undefined") return;
  document.cookie = `${ANALYTICS_CHOICE_KEY}=${choice ?? "rejected"}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
}
