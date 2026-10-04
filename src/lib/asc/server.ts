import { NextResponse } from "next/server";
import type { DbClient } from "@/lib/supabase/types";
import { createServerSupabase } from "../supabase/server";
import { createAdminSupabase } from "../supabase/admin";
import { readWorkspaceBilling } from "../workspace-billing";
import { isProPlan } from "../plans";
import type { PlanId } from "../specs";
import { ascConnectorEnabled } from "./config";
import { loadAscCredentials } from "./credentials";
import { AscError, ascErrorStatus, createAscClient, type AscClient, type AscClientOptions } from "./client";

export { loadAscCredentials };

export const NO_STORE = { "Cache-Control": "private, no-store" };

export type AscContext = {
  userId: string; workspaceId: string; role: string; plan: PlanId; paid: boolean; admin: DbClient;
};

const fail = (error: string, status: number) => ({ ok: false as const, response: NextResponse.json({ error }, { status, headers: NO_STORE }) });

/**
 * Shared gate for every /api/asc route: feature flag, session, active workspace,
 * optional owner role and paid plan. Paid status is resolved with the same
 * entitlement logic as exports, so a lapsed subscription loses access at once.
 */
export async function ascContext({ owner = false, paid = true }: { owner?: boolean; paid?: boolean } = {}) {
  if (!ascConnectorEnabled()) return fail("NOT_FOUND", 404);
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("AUTH_REQUIRED", 401);
  const billing = await readWorkspaceBilling(supabase, user.id);
  if (!billing.ok) return fail(billing.error, billing.status);
  if (owner && billing.membership.role !== "owner") return fail("OWNER_REQUIRED", 403);
  const isPaid = isProPlan(billing.entitlements.plan);
  if (paid && !isPaid) return fail("PAID_PLAN_REQUIRED", 403);
  const admin = createAdminSupabase();
  if (!admin) return fail("ASC_UNAVAILABLE", 503);
  return {
    ok: true as const,
    context: {
      userId: user.id, workspaceId: billing.membership.workspace_id, role: billing.membership.role,
      plan: billing.entitlements.plan, paid: isPaid, admin,
    } satisfies AscContext,
  };
}

export async function workspaceAscClient(context: AscContext, options?: AscClientOptions) {
  const credentials = await loadAscCredentials(context.admin, context.workspaceId);
  return credentials ? createAscClient(credentials, options) : null;
}

/** Maps any failure from an Apple call to a stable JSON error. */
export function ascFailure(error: unknown) {
  if (error instanceof AscError) {
    return NextResponse.json({ error: error.code }, { status: ascErrorStatus(error.code), headers: NO_STORE });
  }
  const code = error instanceof Error && ["ASC_KEY_UNREADABLE", "ASC_UNAVAILABLE"].includes(error.message) ? error.message : "ASC_UNAVAILABLE";
  if (code === "ASC_UNAVAILABLE") console.error("asc_request_failed", { message: error instanceof Error ? error.message : String(error) });
  return NextResponse.json({ error: code }, { status: 503, headers: NO_STORE });
}

export function maskIssuerId(issuerId: string): string {
  return `••••••••-••••-••••-••••-••••••••${issuerId.slice(-4)}`;
}

/** Read-only Apple lookups for the tool: paid member, connected workspace, stable errors. */
export async function withAscClient<T>(read: (client: AscClient) => Promise<T>) {
  const gate = await ascContext();
  if (!gate.ok) return gate.response;
  try {
    const client = await workspaceAscClient(gate.context);
    if (!client) return NextResponse.json({ error: "ASC_NOT_CONNECTED" }, { status: 409, headers: NO_STORE });
    return NextResponse.json(await read(client), { headers: NO_STORE });
  } catch (error) {
    return ascFailure(error);
  }
}
