import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — review routes return 503 STORAGE_UNAVAILABLE",
      );
    }
    return null;
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
