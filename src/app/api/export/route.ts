import { executeExport } from "@/lib/render/export";
import { enqueueRender } from "@/lib/render/enqueue";
import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  return serverEnv.render.queueEnabled
    ? enqueueRender(request, supabase, user.id, "export")
    : executeExport(request, supabase, user);
}
