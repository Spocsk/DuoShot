import { getSupabaseUrl } from "./env";

/** Keep server traffic on the private Docker network when self-hosted. */
export function getSupabaseServerUrl() {
  return process.env.SUPABASE_INTERNAL_URL || getSupabaseUrl();
}

/** SSR and the browser must use the same cookie name despite different hosts. */
export function getSupabaseAuthCookieName() {
  const hostname = new URL(getSupabaseUrl()).hostname;
  return `sb-${hostname.split(".")[0]}-auth-token`;
}

/** Storage SDK signs over the internal API but returns an absolute URL to it. */
export function publicSupabaseUrl(value: string) {
  if (!process.env.SUPABASE_INTERNAL_URL) return value;
  const url = new URL(value);
  if (url.origin !== new URL(process.env.SUPABASE_INTERNAL_URL).origin) return value;
  const publicUrl = new URL(getSupabaseUrl());
  url.protocol = publicUrl.protocol;
  url.host = publicUrl.host;
  url.port = publicUrl.port;
  return url.toString();
}
