"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";
import { supabaseCookieOptions } from "./cookie-options";
import type { Database } from "./types";

export function createBrowserSupabase() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublicKey(), { cookieOptions: supabaseCookieOptions() });
}
