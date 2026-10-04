import { readRenderBody } from "./read-body";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "../supabase/admin";
import { readWorkspaceBilling } from "../workspace-billing";
import { parseRenderBody, renderErrorStatus } from "../pipeline/request";
import { canUse69 } from "../specs";

/** Codes thrown by body reading and validation; anything else is an internal failure. */
const CLIENT_ERROR_CODES = new Set(["INVALID_REQUEST", "INPUT_TOO_LARGE", "INVALID_PAIRS", "PATH_FORBIDDEN", "INVALID_OPTIONS", "INVALID_TRANSFORMS"]);

export async function enqueueRender(request: Request, client: SupabaseClient, userId: string, kind: "export" | "review") {
  try {
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(key)) {
      return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
    }
    const body = parseRenderBody(await readRenderBody(request), userId);
    const outer = body.outerPaths ?? body.paths ?? [];
    const inner = body.sameSet ? outer : body.innerPaths ?? body.paths ?? [];
    if (!outer.length && !inner.length) return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
    if (kind === "review" && (!outer.length || outer.length !== inner.length)) return NextResponse.json({ error: "INVALID_PAIRS" }, { status: 400 });
    const context = await readWorkspaceBilling(client, userId);
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
    if (kind === "review" && context.entitlements.plan !== "studio") return NextResponse.json({ error: "STUDIO_REQUIRED" }, { status: 403 });
    if (body.include69 && !canUse69(context.entitlements.plan)) return NextResponse.json({ error: "IPHONE_69_GATED" }, { status: 403 });
    const admin = createAdminSupabase();
    if (!admin) return NextResponse.json({ error: "EXPORT_UNAVAILABLE" }, { status: 503 });
    const { data, error } = await admin.rpc("enqueue_render", {
      p_user: userId, p_workspace: context.membership.workspace_id, p_kind: kind, p_key: key, p_payload: body,
    });
    if (error) {
      const code = ["TRIAL_EXHAUSTED", "DAILY_LIMIT", "RENDER_BUSY", "RENDER_ALREADY_PENDING", "IDEMPOTENCY_CONFLICT"].find(c => error.message.includes(c));
      return NextResponse.json({ error: code ?? "EXPORT_UNAVAILABLE" }, { status: code === "TRIAL_EXHAUSTED" || code === "DAILY_LIMIT" ? 402 : code === "IDEMPOTENCY_CONFLICT" || code === "RENDER_ALREADY_PENDING" ? 409 : 503 });
    }
    return NextResponse.json({ jobId: data, statusUrl: `/api/render-jobs/${data}` }, { status: 202, headers: { "Cache-Control": "no-store", "Retry-After": "2" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    if (error instanceof Error && CLIENT_ERROR_CODES.has(error.message)) {
      return NextResponse.json({ error: error.message }, { status: renderErrorStatus(error.message) });
    }
    console.error("render_enqueue_failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "EXPORT_UNAVAILABLE" }, { status: 503 });
  }
}
