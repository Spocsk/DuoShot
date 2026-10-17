export const ATTRIBUTION_COOKIE = "ds_attr";
export const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
type Attribution = Partial<Record<(typeof UTM_KEYS)[number] | "referrer", string>>;

function sanitizeValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Do not turn email addresses or full URLs into campaign labels. Only the
  // allowlisted campaign fields are collected, never arbitrary query params.
  if (/@|%40|:\/\/|%3a%2f%2f/i.test(value)) return undefined;
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64) || undefined;
}

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

function externalHost(hostname: unknown, ownHostname: string): string | undefined {
  if (typeof hostname !== "string" || !/^[a-z0-9.-]+$/i.test(hostname)) return undefined;
  if (normalizedHost(hostname) === normalizedHost(ownHostname)) return undefined;
  return sanitizeValue(hostname);
}

function sanitizeAttribution(value: unknown, ownHostname: string): Attribution {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const attribution: Attribution = {};
  for (const key of UTM_KEYS) {
    const sanitized = sanitizeValue(input[key]);
    if (sanitized) attribution[key] = sanitized;
  }
  const referrer = externalHost(input.referrer, ownHostname);
  if (referrer) attribution.referrer = referrer;
  return attribution;
}

export function landingAttribution(url: URL, referer: string | null): Attribution {
  const values: Record<string, unknown> = {};
  for (const key of UTM_KEYS) values[key] = url.searchParams.get(key);
  if (referer) {
    try {
      const referrer = new URL(referer);
      if (referrer.protocol === "https:" || referrer.protocol === "http:") {
        values.referrer = referrer.hostname;
      }
    } catch {
      // An invalid Referer must not interfere with the landing page.
    }
  }
  return sanitizeAttribution(values, url.hostname);
}

export function readAttribution(cookieHeader: string | null, ownHostname: string): Attribution {
  try {
    const cookie = cookieHeader?.split(";").map((part) => part.trim())
      .find((part) => part.startsWith(`${ATTRIBUTION_COOKIE}=`));
    if (!cookie) return {};
    const value = decodeURIComponent(cookie.slice(ATTRIBUTION_COOKIE.length + 1));
    return sanitizeAttribution(JSON.parse(value), ownHostname);
  } catch {
    // Attribution is optional: malformed/forged cookies must never stop checkout.
    return {};
  }
}
