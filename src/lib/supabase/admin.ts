import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerUrl } from "./server-env";
import { serverEnv } from "../env";

export function createAdminSupabase() {
  const key = serverEnv.supabase.adminKey;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — public review routes return 503 and review writes use the user client (RLS)",
      );
    }
    return null;
  }
  return createClient(getSupabaseServerUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin when configured, otherwise the authenticated user client (RLS). */
export function createReviewWriter(userClient: SupabaseClient) {
  return createAdminSupabase() ?? userClient;
}
