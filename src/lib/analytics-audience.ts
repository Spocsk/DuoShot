import { serverEnv } from "./env";

/** Server-controlled cohort; never trust user-editable auth metadata. */
export function analyticsAudience(userId: string): "internal" | "external" {
  return serverEnv.analytics.internalUserIds.includes(userId) ? "internal" : "external";
}
