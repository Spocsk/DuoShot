"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";

export function createBrowserSupabase() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey());
}
