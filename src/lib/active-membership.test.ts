import { describe, expect, it } from "vitest";
import { createQueryBuilder } from "@/test/supabase-mock";
import { readActiveMembership, requireMembership } from "./active-membership";

const client = (result: { data: unknown; error: unknown }) => ({ from: () => createQueryBuilder(result) }) as never;

describe("readActiveMembership", () => {
  it("returns the active membership", async () => {
    expect(await readActiveMembership(client({ data: { workspace_id: "ws-1", role: "owner" }, error: null }), "user-1"))
      .toEqual({ failed: false, membership: { workspace_id: "ws-1", role: "owner" } });
  });

  it("distinguishes no workspace from a failed lookup", async () => {
    expect(await readActiveMembership(client({ data: null, error: null }), "user-1")).toEqual({ failed: false, membership: null });
    expect(await readActiveMembership(client({ data: null, error: { message: "timeout" } }), "user-1")).toEqual({ failed: true, membership: null });
  });
});

describe("requireMembership", () => {
  const gate = (user: { id: string } | null, result: { data: unknown; error: unknown }) => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => createQueryBuilder(result),
  }) as never;
  const denied = async (pending: ReturnType<typeof requireMembership>) => {
    const outcome = await pending;
    if (outcome.ok) throw new Error("expected a denial");
    return { status: outcome.response.status, body: await outcome.response.json() };
  };
  const owner = { data: { workspace_id: "ws-1", role: "owner" }, error: null };
  const member = { data: { workspace_id: "ws-1", role: "member" }, error: null };

  it("passes the user and membership through", async () => {
    expect(await requireMembership(gate({ id: "user-1" }, member))).toEqual({ ok: true, user: { id: "user-1" }, membership: member.data });
    expect(await requireMembership(gate({ id: "user-1" }, owner), { role: "owner" })).toMatchObject({ ok: true });
  });

  it("answers 401, 503, 409 and 403 in that order", async () => {
    expect(await denied(requireMembership(gate(null, owner)))).toEqual({ status: 401, body: { error: "AUTH_REQUIRED" } });
    expect(await denied(requireMembership(gate({ id: "user-1" }, { data: null, error: { message: "timeout" } }), { role: "owner" })))
      .toEqual({ status: 503, body: { error: "WORKSPACE_UNAVAILABLE" } });
    expect(await denied(requireMembership(gate({ id: "user-1" }, { data: null, error: null }))))
      .toEqual({ status: 409, body: { error: "NO_WORKSPACE" } });
    expect(await denied(requireMembership(gate({ id: "user-1" }, { data: null, error: null }), { role: "owner" })))
      .toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    expect(await denied(requireMembership(gate({ id: "user-1" }, member), { role: "owner" })))
      .toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
  });
});
