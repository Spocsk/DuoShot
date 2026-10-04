import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";
import { getSupabaseAuthCookieName, getSupabaseServerUrl } from "./server-env";
import { supabaseCookieOptions } from "./cookie-options";

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const headers = requestHeaders ?? new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: { headers },
  });
  if (!getSupabaseUrl() || !getSupabasePublicKey()) {
    return supabaseResponse;
  }
  const supabase = createServerClient(getSupabaseServerUrl(), getSupabasePublicKey(), {
    cookieOptions: { ...supabaseCookieOptions(), name: getSupabaseAuthCookieName() },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request: { headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh only: getClaims() goes through getSession(), which rotates an expiring
  // token and writes the cookies through setAll above. It then verifies the access
  // token locally against the cached JWKS (asymmetric signing keys) and only falls
  // back to a getUser() round-trip for HS256 tokens. Route handlers still call
  // getUser() themselves before trusting the identity.
  await supabase.auth.getClaims();
  return supabaseResponse;
}
