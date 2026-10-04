import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Explicit columns keep secrets out of the file: invitation token hashes, render leases.
const WORKSPACE_COLUMNS = "id, name, slug, plan, created_at, updated_at";
const APP_COLUMNS = "id, workspace_id, name, slug, client_name, orientation, created_at, updated_at";
const RENDER_JOB_COLUMNS = "id, workspace_id, kind, state, payload, attempts, error_code, created_at, finished_at";
const REVIEW_LINK_COLUMNS = "id, public_id, workspace_id, app_id, set_name, client_name, orientation, status, comment, created_at, updated_at, expires_at, revoked_at";
const INVITATION_COLUMNS = "id, workspace_id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at";

function exportFailed(stage: string) {
  console.error("account_export_failed", { stage });
  return NextResponse.json({ error: "EXPORT_FAILED" }, { status: 503 });
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  // review_links and workspace_invitations have no user-facing RLS policy: the user client
  // would return an empty list without an error, so they are read with the service role.
  const admin = createAdminSupabase();
  if (!admin) return exportFailed("admin_unavailable");
  const email = user.email?.trim().toLowerCase() ?? null;

  const [workspaceMembers, consents, exports, dsar, renderJobs, reviewLinks, sentInvitations, receivedInvitations] = await Promise.all([
    supabase.from("workspace_members").select("*").eq("user_id", user.id),
    supabase.from("consent_events").select("*").eq("user_id", user.id),
    supabase.from("export_sets").select("*").eq("created_by", user.id),
    supabase.from("dsar_requests").select("*").eq("user_id", user.id),
    supabase.from("render_jobs").select(RENDER_JOB_COLUMNS).eq("user_id", user.id),
    admin.from("review_links").select(REVIEW_LINK_COLUMNS).eq("created_by", user.id),
    admin.from("workspace_invitations").select(INVITATION_COLUMNS).eq("invited_by", user.id),
    // Invitations are stored lower-cased (create_workspace_invitation).
    email ? admin.from("workspace_invitations").select(INVITATION_COLUMNS).eq("email", email) : Promise.resolve({ data: [], error: null }),
  ]);
  const firstPass = { workspaceMembers, consents, exports, dsar, renderJobs, reviewLinks, sentInvitations, receivedInvitations };
  const failed = Object.entries(firstPass).find(([, result]) => result.error);
  // A partial file would look like a complete export, so fail instead.
  if (failed) return exportFailed(failed[0]);

  const workspaceIds = [...new Set((workspaceMembers.data ?? []).map((row: { workspace_id: string }) => row.workspace_id))];
  const [workspaces, apps] = workspaceIds.length
    ? await Promise.all([
      supabase.from("workspaces").select(WORKSPACE_COLUMNS).in("id", workspaceIds),
      supabase.from("apps").select(APP_COLUMNS).in("workspace_id", workspaceIds),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (workspaces.error) return exportFailed("workspaces");
  if (apps.error) return exportFailed("apps");

  // Only a complete export is recorded as done; a failed insert must not hand out the file.
  const logged = await supabase.from("dsar_requests").insert({
    user_id: user.id,
    type: "export",
    status: "done",
    processed_at: new Date().toISOString(),
  });
  if (logged.error) return exportFailed("dsar_log");

  const invitations = new Map(
    [...(sentInvitations.data ?? []), ...(receivedInvitations.data ?? [])].map((row: { id: string }) => [row.id, row]),
  );
  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    workspace_members: workspaceMembers.data,
    workspaces: workspaces.data,
    apps: apps.data,
    consent_events: consents.data,
    export_sets: exports.data,
    render_jobs: renderJobs.data,
    review_links: reviewLinks.data,
    workspace_invitations: [...invitations.values()],
    dsar_requests: dsar.data,
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
