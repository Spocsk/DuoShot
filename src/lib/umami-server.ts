import { UMAMI_DOMAIN, UMAMI_ORIGIN, UMAMI_WEBSITE_ID } from "./umami-config";

// Umami v3.0.3 silently discards events when isbot flags the User-Agent; this value passes its filter.
export const UMAMI_SERVER_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) DuoShot/1.0";

/** Optional revenue reporting must never interrupt Stripe processing. */
export async function sendUmamiServerEvent(name: string, data: Record<string, string | number | boolean>) {
  try {
    const response = await fetch(process.env.UMAMI_SEND_URL || `${UMAMI_ORIGIN}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UMAMI_SERVER_USER_AGENT },
      body: JSON.stringify({ type: "event", payload: {
        website: UMAMI_WEBSITE_ID, hostname: UMAMI_DOMAIN, url: "/billing/webhook",
        language: "fr-FR", screen: "0x0", title: "", referrer: "", name, data,
      } }),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok || (await response.json())?.beep === "boop") console.warn("[umami] server event unavailable");
  } catch { console.warn("[umami] server event unavailable"); }
}
