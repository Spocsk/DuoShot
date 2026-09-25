import { analyticsAudience } from "@/lib/analytics-audience";
import { NextResponse } from "next/server";
import { checkoutAvailable } from "@/lib/billing-availability";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const result = await readWorkspaceBilling(supabase, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ...result.entitlements, checkoutAvailable: checkoutAvailable(), audience: analyticsAudience(user.id) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
