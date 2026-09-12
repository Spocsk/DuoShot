/** Public project (anon/publishable). Override with env in Vercel if rotated. */
const FALLBACK_SUPABASE_URL = "https://jvhqcmqwrihbtwrggwuq.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_kvV208fd0DcOXSumF4xzWw_p2eic6KC";

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
}

export function getSupabasePublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY
  );
}
