import { publicEnv } from "../env-public";
export function getSupabaseUrl(): string {
  return publicEnv.supabaseUrl;
}

export function getSupabasePublicKey(): string {
  return publicEnv.supabasePublicKey;
}
