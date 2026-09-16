import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";

export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — review routes use the user/anon client",
      );
    }
    return null;
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createPublicSupabase() {
  return createClient(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin when configured, otherwise the anon client (RPCs + public storage). */
export function createReviewReader() {
  return createAdminSupabase() ?? createPublicSupabase();
}

/** Admin when configured, otherwise the authenticated user client (RLS). */
export function createReviewWriter(userClient: SupabaseClient) {
  return createAdminSupabase() ?? userClient;
}
