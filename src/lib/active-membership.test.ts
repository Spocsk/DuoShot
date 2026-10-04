import { describe, expect, it } from "vitest";
import { createQueryBuilder } from "@/test/supabase-mock";
import { readActiveMembership } from "./active-membership";

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
