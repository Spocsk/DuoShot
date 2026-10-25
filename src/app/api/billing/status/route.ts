import { analyticsAudience } from "@/lib/analytics-audience";
import { internalCookie } from "@/lib/analytics-internal";
import { NextResponse } from "next/server";
import { checkoutAvailable } from "@/lib/billing-availability";
import { serverEnv } from "@/lib/env";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const result = await readWorkspaceBilling(supabase, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const audience = analyticsAudience(user.id);
  const headers = new Headers({ "Cache-Control": "no-store" });
  // Staff accounts opt out of Umami everywhere, without waiting for a ?internal=1 visit.
  if (audience === "internal") headers.append("Set-Cookie", internalCookie("set", serverEnv.isProduction));
  return NextResponse.json({ ...result.entitlements, checkoutAvailable: checkoutAvailable(user.id), audience }, { headers });
}
