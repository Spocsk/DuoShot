import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { slugify } from "@/lib/pipeline/geometry";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = "id, name, slug, client_name, orientation";

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
    .select(COLUMNS)
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
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    name?: unknown;
    clientName?: unknown;
    orientation?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const name = (typeof body.name === "string" ? body.name.trim() : "") || "App";
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() || null : null;
  if (name.length > MAX_NAME_LENGTH || (clientName?.length ?? 0) > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "NAME_TOO_LONG" }, { status: 400 });
  }
  const row = {
    workspace_id: membership.workspace_id,
    name,
    slug: slugify(name),
    client_name: clientName,
    orientation: body.orientation === "landscape" ? "landscape" : "portrait",
  };

  // A known app is renamed in place so typing a name never leaves one row per prefix.
  if (typeof body.id === "string" && UUID.test(body.id)) {
    const update = (values: Partial<typeof row>) =>
      supabase
        .from("apps")
        .update(values)
        .eq("id", body.id as string)
        .eq("workspace_id", membership.workspace_id)
        .select(COLUMNS)
        .maybeSingle();
    let { data, error } = await update(row);
    // Another app already owns this slug: keep the current slug, still save the name.
    if (error?.code === "23505") ({ data, error } = await update({ name, client_name: clientName, orientation: row.orientation }));
    if (error) return NextResponse.json({ error: "APP_SAVE_FAILED" }, { status: 500 });
    if (data) return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("apps")
    .upsert(row, { onConflict: "workspace_id,slug" })
    .select(COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: "APP_SAVE_FAILED" }, { status: 500 });
  return NextResponse.json(data);
}
