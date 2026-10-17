import { sanitizeValue } from "./attribution";

const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"] as const;

/** Campaign labels only; shared by the in-memory capture and the untrusted relay. */
export function sanitizedCampaignQuery(search: string): string {
  const input = new URLSearchParams(search);
  const campaign = new URLSearchParams();
  for (const key of CAMPAIGN_KEYS) {
    const value = sanitizeValue(input.get(key));
    if (value) campaign.set(key, value);
  }
  return campaign.toString();
}
