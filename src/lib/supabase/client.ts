"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";
import { supabaseCookieOptions } from "./cookie-options";

export function createBrowserSupabase() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey(), { cookieOptions: supabaseCookieOptions() });
}
