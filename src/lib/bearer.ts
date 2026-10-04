import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time check of `Authorization: Bearer <secret>`. Both sides are hashed first so the
 * comparison never leaks the secret's length and timingSafeEqual always gets equal-size buffers.
 * An unset or empty secret never authorizes anything.
 */
export function verifyBearer(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

let warnedFallback = false;

/**
 * The render worker has its own secret so a leaked cron secret cannot drive renders (and the
 * reverse). During rollout, a container started before RENDER_WORKER_SECRET is set keeps
 * working with CRON_SECRET and warns once per process.
 */
export function renderWorkerSecret(): string | undefined {
  const dedicated = process.env.RENDER_WORKER_SECRET;
  if (dedicated) return dedicated;
  const legacy = process.env.CRON_SECRET;
  if (legacy && !warnedFallback) {
    warnedFallback = true;
    console.warn("render_worker_secret_fallback", { using: "CRON_SECRET" });
  }
  return legacy || undefined;
}

export function resetRenderWorkerSecretWarning() {
  warnedFallback = false;
}
