import { NextResponse } from "next/server";
import { ascContext, NO_STORE } from "@/lib/asc/server";
import { ascTargetsForExport, EXPORT_MAX_AGE_MS, parseAscUploadPayload, type AscUploadPayload } from "@/lib/asc/upload-job";

export const runtime = "nodejs";

const KEY = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * Queues an upload of an export already rendered for this workspace. Progress and
 * the result are read from the shared render job status route.
 */
export async function POST(request: Request) {
  const gate = await ascContext();
  if (!gate.ok) return gate.response;
  const { admin, workspaceId, userId, role } = gate.context;
  // Without the worker the job would only wait and expire.
  if (process.env.RENDER_QUEUE_ENABLED !== "true") return json({ error: "QUEUE_DISABLED" }, 503);
  const key = request.headers.get("idempotency-key");
  if (!key || !KEY.test(key)) return json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, 400);
  const text = await request.text();
  if (text.length > 4096) return json({ error: "INPUT_TOO_LARGE" }, 413);
  let body: Partial<AscUploadPayload>;
  try { body = JSON.parse(text); } catch { return json({ error: "INVALID_REQUEST" }, 400); }
  // Replacing deletes the workspace's live screenshots: an owner decision.
  if (body.replaceExisting === true && role !== "owner") return json({ error: "OWNER_REQUIRED" }, 403);

  const connection = await admin.from("asc_connections").select("id").eq("workspace_id", workspaceId).maybeSingle();
  if (connection.error) return json({ error: "ASC_UNAVAILABLE" }, 503);
  if (!connection.data) return json({ error: "ASC_NOT_CONNECTED" }, 409);

  const exportId = typeof body.exportId === "string" ? body.exportId : "";
  if (!KEY.test(exportId)) return json({ error: "INVALID_REQUEST" }, 400);
  const exported = await admin.from("export_sets").select("include_69, storage_path, created_at")
    .eq("id", exportId).eq("workspace_id", workspaceId).maybeSingle();
  if (exported.error) return json({ error: "ASC_UNAVAILABLE" }, 503);
  if (!exported.data?.storage_path || Date.now() - Date.parse(exported.data.created_at) > EXPORT_MAX_AGE_MS) {
    return json({ error: "EXPORT_EXPIRED" }, 410);
  }
  // iPhone Duo has no App Store Connect display type yet; only mapped slots are sent.
  const { targets, skipped } = ascTargetsForExport(Boolean(exported.data.include_69));
  if (!targets.length) return json({ error: "NOTHING_TO_UPLOAD", skipped }, 409);

  let payload: AscUploadPayload;
  try {
    payload = parseAscUploadPayload({ ...body, exportId, replaceExisting: body.replaceExisting === true, targets });
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
  const { data, error } = await admin.rpc("enqueue_render", {
    p_user: userId, p_workspace: workspaceId, p_kind: "asc_upload", p_key: key, p_payload: payload,
  });
  if (error) {
    const code = ["RENDER_BUSY", "RENDER_ALREADY_PENDING", "IDEMPOTENCY_CONFLICT", "NO_WORKSPACE"].find((value) => error.message.includes(value));
    return json({ error: code ?? "ASC_UNAVAILABLE" }, code === "RENDER_BUSY" || !code ? 503 : 409);
  }
  return NextResponse.json({ jobId: data, statusUrl: `/api/render-jobs/${data}`, skipped }, {
    status: 202, headers: { ...NO_STORE, "Retry-After": "2" },
  });
}
