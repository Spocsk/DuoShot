/** Default booking URL used when NEXT_PUBLIC_CALL_BOOKING_URL is unset or blank. */
export const DEFAULT_CALL_BOOKING_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0ScSaJ5TpHWZMZD-TyvkQ0odsP6ymUPlU2Zgodwvd7KP87Y8ARQOqx3VZz8B4TIaXYuN0lcDmV";

/**
 * Booking URL for the "15-min call = 7 days of Pro free" offer. Read from a public env var
 * so it is inlined into the client bundle; trimmed and falling back to DEFAULT_CALL_BOOKING_URL
 * when unset or blank, while a non-empty env value overrides it. The CallCtaCard renders nothing
 * when the resolved value is not an https URL (see call-cta-card.tsx).
 */
export const CALL_BOOKING_URL = process.env.NEXT_PUBLIC_CALL_BOOKING_URL?.trim() || DEFAULT_CALL_BOOKING_URL;
