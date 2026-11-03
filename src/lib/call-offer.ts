/**
 * Booking URL for the "15-min call = 7 days of Pro free" offer. Read from a public env var
 * so it is inlined into the client bundle; trimmed and defaulting to "" when unset. The
 * CallCtaCard renders nothing while it is empty or not an https URL (see call-cta-card.tsx).
 */
export const CALL_BOOKING_URL = process.env.NEXT_PUBLIC_CALL_BOOKING_URL?.trim() ?? "";
