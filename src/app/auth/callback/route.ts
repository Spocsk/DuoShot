import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { authDestination, authFailure } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = authDestination(url.searchParams.get("next"));
  try {
    if (code && !url.searchParams.has("error")) {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) return NextResponse.redirect(next, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    }
  } catch {
    // Do not expose provider messages or authorization codes in the redirect.
  }
  return NextResponse.redirect(authFailure(next), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
