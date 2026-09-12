import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/tool";
  if (token_hash && type) {
    const supabase = await createServerSupabase();
    await supabase.auth.verifyOtp({ type, token_hash });
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
