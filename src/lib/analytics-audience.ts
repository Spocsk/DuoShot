/** Server-controlled cohort; never trust user-editable auth metadata. */
export function analyticsAudience(userId: string): "internal" | "external" {
  return (process.env.ANALYTICS_INTERNAL_USER_IDS ?? "").split(",").map((id) => id.trim()).includes(userId) ? "internal" : "external";
}
