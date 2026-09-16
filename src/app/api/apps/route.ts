import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { slugify } from "@/lib/pipeline/geometry";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ apps: [] });
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ apps: [] });
  const { data } = await supabase
    .from("apps")
    .select("id, name, slug, client_name, orientation")
    .eq("workspace_id", membership.workspace_id)
    .order("updated_at", { ascending: false });
  return NextResponse.json({ apps: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });
  const body = (await request.json()) as {
    name?: string;
    clientName?: string;
    orientation?: "portrait" | "landscape";
  };
  const name = body.name?.trim() || "App";
  const { data, error } = await supabase
    .from("apps")
    .upsert(
      {
        workspace_id: membership.workspace_id,
        name,
        slug: slugify(name),
        client_name: body.clientName?.trim() || null,
        orientation: body.orientation === "landscape" ? "landscape" : "portrait",
      },
      { onConflict: "workspace_id,slug" },
    )
    .select("id, name, slug, client_name, orientation")
    .single();
  if (error) return NextResponse.json({ error: "APP_SAVE_FAILED" }, { status: 500 });
  return NextResponse.json(data);
}
