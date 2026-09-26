import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { authDestination, authFailure } from "@/lib/auth-redirect";

const emailTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = authDestination(url.searchParams.get("next"));
  try {
    if (token_hash && type && emailTypes.has(type)) {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (!error && data.session) {
        const destination = type === "recovery" ? authDestination(next.pathname.startsWith("/en/") ? "/en/reset-password" : "/reset-password") : next;
        return NextResponse.redirect(destination, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
      }
    }
  } catch {
    // Invalid/expired tokens and provider failures share a safe public message.
  }
  return NextResponse.redirect(authFailure(next), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
