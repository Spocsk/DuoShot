import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { QueryResult } from "@/test/supabase-mock";
import { readWorkspaceBilling } from "./workspace-billing";

type Call = { table: string; method: string; args: unknown[] };

/** Records every builder call so the query shape (e.g. the active filter) can be asserted. */
function recordingClient(results: Record<string, QueryResult>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "limit"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return builder;
        };
      }
      builder.maybeSingle = async () => {
        calls.push({ table, method: "maybeSingle", args: [] });
        return results[table] ?? { data: null, error: null };
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const MEMBERSHIP = { workspace_id: "ws-1", role: "owner" };
const WORKSPACE = {
  id: "ws-1",
  name: "Acme",
  client_slug: "acme",
  plan: "free",
  manual_plan: null,
  free_exports_used: 1,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_status: null,
  subscription_period_end: null,
  subscription_cancel_at_period_end: false,
};

describe("readWorkspaceBilling", () => {
  it("reads only the user's active membership", async () => {
    const { client, calls } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: WORKSPACE, error: null },
    });
    await readWorkspaceBilling(client, "user-1");
    const memberEq = calls.filter((c) => c.table === "workspace_members" && c.method === "eq").map((c) => c.args);
    expect(memberEq).toEqual([["user_id", "user-1"], ["active", true]]);
    expect(calls).toContainEqual({ table: "workspace_members", method: "limit", args: [1] });
    expect(calls).toContainEqual({ table: "workspaces", method: "eq", args: ["id", "ws-1"] });
  });

  it("returns 503 on a membership lookup error and never queries the workspace", async () => {
    const { client, calls } = recordingClient({
      workspace_members: { data: null, error: { message: "connection reset" } },
      workspaces: { data: WORKSPACE, error: null },
    });
    expect(await readWorkspaceBilling(client, "user-1")).toEqual({ ok: false, error: "BILLING_UNAVAILABLE", status: 503 });
    expect(calls.some((c) => c.table === "workspaces")).toBe(false);
  });

  it("returns 409 NO_WORKSPACE without an active membership", async () => {
    const { client, calls } = recordingClient({ workspace_members: { data: null, error: null } });
    expect(await readWorkspaceBilling(client, "user-1")).toEqual({ ok: false, error: "NO_WORKSPACE", status: 409 });
    expect(calls.some((c) => c.table === "workspaces")).toBe(false);
  });

  it("returns 503 instead of a free trial when the workspace read fails", async () => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: null, error: { message: "timeout" } },
    });
    expect(await readWorkspaceBilling(client, "user-1")).toEqual({ ok: false, error: "BILLING_UNAVAILABLE", status: 503 });
  });

  it("returns 503 when the membership points to a missing workspace", async () => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: null, error: null },
    });
    expect(await readWorkspaceBilling(client, "user-1")).toEqual({ ok: false, error: "BILLING_UNAVAILABLE", status: 503 });
  });

  it("returns membership, workspace and free entitlements on the happy path", async () => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: WORKSPACE, error: null },
    });
    const result = await readWorkspaceBilling(client, "user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.membership).toEqual(MEMBERSHIP);
    expect(result.workspace).toEqual(WORKSPACE);
    expect(result.entitlements).toMatchObject({ plan: "free", source: "free", canUse69: false, hasBillingCustomer: false });
    expect(result.entitlements.remainingFreeExports).toBeGreaterThanOrEqual(0);
  });

  it("grants Studio from an active Stripe subscription", async () => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: {
        data: {
          ...WORKSPACE, plan: "studio", stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1",
          subscription_status: "active", subscription_period_end: "2026-11-01T00:00:00Z", subscription_cancel_at_period_end: true,
        },
        error: null,
      },
    });
    const result = await readWorkspaceBilling(client, "user-1");
    if (!result.ok) throw new Error("expected ok");
    expect(result.entitlements).toMatchObject({
      plan: "studio", source: "stripe", canUse69: true, remainingFreeExports: null,
      subscriptionStatus: "active", periodEnd: "2026-11-01T00:00:00Z", cancelAtPeriodEnd: true, hasBillingCustomer: true,
    });
  });

  it.each(["canceled", "past_due", "incomplete", null])("falls back to free for an inactive subscription (%s)", async (status) => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: { ...WORKSPACE, plan: "studio", stripe_subscription_id: "sub_1", subscription_status: status }, error: null },
    });
    const result = await readWorkspaceBilling(client, "user-1");
    if (!result.ok) throw new Error("expected ok");
    expect(result.entitlements.plan).toBe("free");
    expect(result.entitlements.canUse69).toBe(false);
  });

  it("does not trust plan='studio' without a subscription id", async () => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: { ...WORKSPACE, plan: "studio", subscription_status: "active" }, error: null },
    });
    const result = await readWorkspaceBilling(client, "user-1");
    if (!result.ok) throw new Error("expected ok");
    expect(result.entitlements.plan).toBe("free");
  });

  it("honours a manual plan as a workspace grant", async () => {
    const { client } = recordingClient({
      workspace_members: { data: MEMBERSHIP, error: null },
      workspaces: { data: { ...WORKSPACE, manual_plan: "indie" }, error: null },
    });
    const result = await readWorkspaceBilling(client, "user-1");
    if (!result.ok) throw new Error("expected ok");
    expect(result.entitlements).toMatchObject({ plan: "indie", source: "workspace", canUse69: true });
  });
});
