import { createClient } from "@supabase/supabase-js";
import type { Database, DbClient } from "./types";
import { getSupabaseServerUrl } from "./server-env";

export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — public review routes return 503 and review writes use the user client (RLS)",
      );
    }
    return null;
  }
  return createClient<Database>(getSupabaseServerUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Admin when configured, otherwise the authenticated user client (RLS). */
export function createReviewWriter(userClient: DbClient) {
  return createAdminSupabase() ?? userClient;
}
