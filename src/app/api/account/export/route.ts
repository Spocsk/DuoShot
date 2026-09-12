import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const [workspaceMembers, consents, exports, dsar] = await Promise.all([
    supabase.from("workspace_members").select("*").eq("user_id", user.id),
    supabase.from("consent_events").select("*").eq("user_id", user.id),
    supabase.from("export_sets").select("*").eq("created_by", user.id),
    supabase.from("dsar_requests").select("*").eq("user_id", user.id),
  ]);

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
  };

  if (user.email) {
    try {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Export DuoShot",
        text: "Ton export JSON compte est disponible dans le navigateur (téléchargement immédiat).",
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
