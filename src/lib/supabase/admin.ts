import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseServerUrl } from "./server-env";
import { serverEnv } from "../env";

export function createAdminSupabase() {
  const key = serverEnv.supabase.adminKey;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is missing — billing, reviews, the render queue and other service-role routes return 503",
      );
    }
    return null;
  }
  return createClient<Database>(getSupabaseServerUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
