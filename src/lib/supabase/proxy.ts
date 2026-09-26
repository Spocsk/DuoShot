import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";
import { getSupabaseAuthCookieName, getSupabaseServerUrl } from "./server-env";

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const headers = requestHeaders ?? new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: { headers },
  });
  if (!getSupabaseUrl() || !getSupabasePublicKey()) {
    return supabaseResponse;
  }
  const supabase = createServerClient(getSupabaseServerUrl(), getSupabasePublicKey(), {
    cookieOptions: { name: getSupabaseAuthCookieName() },
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

  await supabase.auth.getUser();
  return supabaseResponse;
}
