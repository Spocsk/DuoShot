import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  // App Store Connect keys are service-role only; export metadata, never the key. Without
  // the service key no connection can exist, so there is nothing to read.
  const admin = createAdminSupabase();
  const [workspaceMembers, consents, exports, dsar, asc] = await Promise.all([
    supabase.from("workspace_members").select("*").eq("user_id", user.id),
    supabase.from("consent_events").select("*").eq("user_id", user.id),
    supabase.from("export_sets").select("*").eq("created_by", user.id),
    supabase.from("dsar_requests").select("*").eq("user_id", user.id),
    admin ? admin.from("asc_connections").select("workspace_id, issuer_id, key_id, created_at, last_verified_at").eq("created_by", user.id) : { data: [], error: null },
  ]);
  // A partial file would look like a complete export, so fail instead.
  if ([workspaceMembers, consents, exports, dsar, asc].some((result) => result.error)) {
    return NextResponse.json({ error: "EXPORT_FAILED" }, { status: 503 });
  }

  await supabase.from("dsar_requests").insert({
    user_id: user.id,
    type: "export",
    status: "done",
    processed_at: new Date().toISOString(),
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    workspace_members: workspaceMembers.data,
    consent_events: consents.data,
    export_sets: exports.data,
    dsar_requests: dsar.data,
    asc_connections: asc.data,
  };

  if (user.email) {
    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Export DuoShot",
        text: "Votre export JSON de compte est disponible dans le navigateur (téléchargement immédiat).",
      });
    } catch {
      // Delivery is best-effort; the JSON download still proceeds.
    }
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=duoshot-data.json",
    },
  });
}
