import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicKey } from "./env";
import { getSupabaseAuthCookieName, getSupabaseServerUrl } from "./server-env";
import { supabaseCookieOptions } from "./cookie-options";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(getSupabaseServerUrl(), getSupabasePublicKey(), {
    cookieOptions: { ...supabaseCookieOptions(), name: getSupabaseAuthCookieName() },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — proxy refreshes the session.
        }
      },
    },
  });
}
