// Per-IP fixed-window limits for the API, applied in src/proxy.ts.
//
// ASSUMPTION: production runs exactly ONE `web` container (one standalone Node process
// behind Traefik; see infra/deploy.md). Counters live in this process's memory, so they
// reset on every restart/redeploy, and with N replicas each one counts on its own and the
// effective limit becomes N times the configured value. Scaling `web` out first requires
// moving these windows to a shared store (Redis, or a PostgreSQL table/RPC).
// The `render` container runs the same image but is not routed, so it never counts here.

type Rule = { name: string; methods: string[]; pattern: RegExp; limit: number; windowMs: number };

const MINUTE = 60_000;

// First match wins. Webhook, health, cron and internal worker routes authenticate with
// their own secrets and are never limited here.
export const RATE_LIMIT_RULES: Rule[] = [
  { name: "account", methods: ["GET", "POST"], pattern: /^\/api\/account\/(?:export|delete)$/, limit: 10, windowMs: 60 * MINUTE },
  { name: "invitations", methods: ["POST"], pattern: /^\/api\/workspace\/invitations(?:\/accept)?$/, limit: 30, windowMs: 60 * MINUTE },
  { name: "billing", methods: ["POST"], pattern: /^\/api\/stripe\/(?:checkout|portal)$/, limit: 20, windowMs: 10 * MINUTE },
  // Public, unauthenticated sign-up that sends e-mail, plus its confirm/unsubscribe links.
  { name: "waitlist", methods: ["GET", "POST"], pattern: /^\/api\/waitlist(?:\/(?:confirm|unsubscribe))?$/, limit: 10, windowMs: 10 * MINUTE },
  { name: "oauth-check", methods: ["POST"], pattern: /^\/api\/auth\/oauth-check$/, limit: 30, windowMs: 10 * MINUTE },
  { name: "example-zip", methods: ["GET"], pattern: /^\/api\/example-zip$/, limit: 10, windowMs: 10 * MINUTE },
  { name: "review-decision", methods: ["POST"], pattern: /^\/api\/reviews\/[^/]+\/decision$/, limit: 30, windowMs: 10 * MINUTE },
  // App Store Connect: each call reaches Apple with the workspace key, whose quota is shared.
  { name: "asc-connection", methods: ["POST", "DELETE"], pattern: /^\/api\/asc\/connection$/, limit: 10, windowMs: 10 * MINUTE },
  { name: "asc-upload", methods: ["POST"], pattern: /^\/api\/asc\/uploads$/, limit: 20, windowMs: 10 * MINUTE },
  { name: "asc-read", methods: ["GET"], pattern: /^\/api\/asc\/(?:apps|versions)(?:\/|$)/, limit: 60, windowMs: MINUTE },
  { name: "render", methods: ["POST"], pattern: /^\/api\/(?:export|reviews)$/, limit: 60, windowMs: 10 * MINUTE },
  { name: "analytics", methods: ["POST"], pattern: /^\/api\/datafast\/events$/, limit: 120, windowMs: MINUTE },
  // Render status polling and review media are frequent by design.
  { name: "polling", methods: ["GET"], pattern: /^\/api\/(?:render-jobs\/[^/]+|reviews\/[^/]+\/media)$/, limit: 600, windowMs: MINUTE },
  { name: "api", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], pattern: /^\/api\/(?!stripe\/webhook$|health$|cron\/|internal\/)/, limit: 300, windowMs: MINUTE },
];

const MAX_KEYS = 50_000;
const windows = new Map<string, { count: number; resetAt: number }>();

/** Traefik overwrites X-Real-Ip with the peer address, so clients cannot choose it. */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

export type RateLimitResult = { limited: false } | { limited: true; rule: string; retryAfterSeconds: number };

export function checkRateLimit(method: string, pathname: string, ip: string, now = Date.now()): RateLimitResult {
  const rule = RATE_LIMIT_RULES.find((candidate) => candidate.methods.includes(method) && candidate.pattern.test(pathname));
  if (!rule) return { limited: false };
  const key = `${rule.name}:${ip}`;
  let entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    if (windows.size >= MAX_KEYS) sweep(now);
    entry = { count: 0, resetAt: now + rule.windowMs };
    windows.set(key, entry);
  }
  entry.count++;
  if (entry.count <= rule.limit) return { limited: false };
  return { limited: true, rule: rule.name, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
}

function sweep(now: number) {
  for (const [key, entry] of windows) if (entry.resetAt <= now) windows.delete(key);
  // Under a flood of distinct addresses, drop the oldest windows rather than grow unbounded.
  if (windows.size >= MAX_KEYS) {
    for (const key of [...windows.keys()].slice(0, Math.ceil(MAX_KEYS / 10))) windows.delete(key);
  }
}

export function resetRateLimits() {
  windows.clear();
}
