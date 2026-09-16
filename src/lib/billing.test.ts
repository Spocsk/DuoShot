import { afterEach, describe, expect, it, vi } from "vitest";
import { entitlementsFromPlan, mergePlanSources, planFromWorkspace, resolveEntitlements } from "./billing";
import { getStripe } from "./stripe";

vi.mock("./stripe", () => ({
  getStripe: vi.fn(),
}));

afterEach(() => {
  vi.mocked(getStripe).mockReset();
});

describe("billing", () => {
  it("keeps free plans gated and counted", () => {
    const free = entitlementsFromPlan("free", {
      source: "free",
      freeExportsUsed: 1,
    });
    expect(free.plan).toBe("free");
    expect(free.canUse69).toBe(false);
    expect(free.remainingFreeExports).toBe(1);
  });

  it("unlocks 6.9-inch sizes for indie", () => {
    const indie = entitlementsFromPlan("indie", {
      source: "stripe",
    });
    expect(indie.canUse69).toBe(true);
    expect(indie.remainingFreeExports).toBeNull();
  });

  it("honors a workspace studio grant over a free Stripe result", () => {
    expect(planFromWorkspace("studio")).toBe("studio");
    expect(planFromWorkspace("free")).toBe("free");
    expect(mergePlanSources("free", "studio")).toBe("studio");
    expect(mergePlanSources("indie", "studio")).toBe("studio");
    expect(mergePlanSources("studio", "free")).toBe("studio");
  });
});

function stripeClient(options: {
  customers?: Array<{ id: string; metadata: Record<string, string> }>;
  subscriptions?: Array<{ status: string; metadata: Record<string, string> }>;
}) {
  return {
    customers: { list: async () => ({ data: options.customers ?? [] }) },
    subscriptions: { list: async () => ({ data: options.subscriptions ?? [] }) },
  };
}

describe("resolveEntitlements", () => {
  it("uses the workspace plan when Stripe is missing", async () => {
    vi.mocked(getStripe).mockReturnValue(null);
    const studio = await resolveEntitlements({
      email: "a@example.com",
      workspaceId: "ws-1",
      workspacePlan: "studio",
    });
    expect(studio.plan).toBe("studio");
    expect(studio.source).toBe("workspace");
    expect(studio.canUse69).toBe(true);

    const free = await resolveEntitlements({
      email: null,
      workspaceId: "ws-1",
      workspacePlan: "free",
    });
    expect(free.plan).toBe("free");
    expect(free.source).toBe("mock");
  });

  it("keeps a workspace grant when Stripe has no matching customer", async () => {
    vi.mocked(getStripe).mockReturnValue(stripeClient({ customers: [] }) as never);
    const entitlements = await resolveEntitlements({
      email: "a@example.com",
      workspaceId: "ws-1",
      workspacePlan: "studio",
    });
    expect(entitlements.plan).toBe("studio");
    expect(entitlements.source).toBe("workspace");
  });

  it("unlocks Studio from an active studio_monthly subscription", async () => {
    vi.mocked(getStripe).mockReturnValue(
      stripeClient({
        customers: [{ id: "cus_1", metadata: { workspace_id: "ws-1" } }],
        subscriptions: [{ status: "active", metadata: { kind: "studio_monthly" } }],
      }) as never,
    );
    const entitlements = await resolveEntitlements({
      email: "a@example.com",
      workspaceId: "ws-1",
      workspacePlan: "free",
    });
    expect(entitlements.plan).toBe("studio");
    expect(entitlements.source).toBe("stripe");
  });

});
