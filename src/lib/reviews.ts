export const REVIEW_TTL_DAYS = 7;
export const REVIEW_TTL_MS = REVIEW_TTL_DAYS * 24 * 60 * 60 * 1000;

export type ReviewLifecycle = {
  status?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
};

export function reviewExpiresAt(now = Date.now()): string {
  return new Date(now + REVIEW_TTL_MS).toISOString();
}

export function reviewState(review: ReviewLifecycle, now = Date.now()) {
  const revoked = Boolean(review.revoked_at) || review.status === "revoked";
  const expired =
    !revoked &&
    (review.status === "expired" || Boolean(review.expires_at && new Date(review.expires_at).getTime() <= now));
  return {
    status: revoked ? "revoked" : expired ? "expired" : (review.status ?? "pending"),
    expired,
    revoked,
    expiresAt: review.expires_at ?? null,
  };
}
