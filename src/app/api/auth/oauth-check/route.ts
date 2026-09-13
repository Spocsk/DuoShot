import { NextResponse } from "next/server";
import { getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url : "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const allowed = new URL(getSupabaseUrl());
  if (parsed.origin !== allowed.origin || parsed.pathname !== "/auth/v1/authorize") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const res = await fetch(parsed.toString(), { redirect: "manual" });
  if (res.status >= 400) {
    return NextResponse.json({ ok: false, status: res.status });
  }
  return NextResponse.json({ ok: true });
}
