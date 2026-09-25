import { analyticsAudience } from "./analytics-audience";
import type { SupabaseClient } from "@supabase/supabase-js";

type ServerEvent = "export_succeeded" | "review_created" | "subscription_activated";

/** Analytics must never affect the product response or Stripe webhook acknowledgement. */
export async function trackServerEvent(
  supabase: SupabaseClient,
  userId: string,
  event: ServerEvent,
  insertId: string,
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return;
  try {
    const { data, error } = await supabase.from("consent_events")
      .select("accepted").eq("user_id", userId).eq("kind", "analytics")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || data?.accepted !== true) return;
    await fetch("https://api-eu.mixpanel.com/track?verbose=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{
        event,
        properties: {
          token, distinct_id: userId, $insert_id: insertId, time: Math.floor(Date.now() / 1000),
          ...properties, audience: analyticsAudience(userId),
        },
      }]),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Analytics is best effort. Billing, export and reviews keep their own records.
  }
}
