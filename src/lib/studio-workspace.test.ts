import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStudioWorkspace } from "./studio-workspace";

const lists = {
  reviews: [{ public_id: "review-1", set_name: "Harbor", client_name: null, status: "pending", expiresAt: null }],
  invitations: [{ id: "invite-1", email: "guest@example.com", expires_at: "2026-10-20T00:00:00Z" }],
  members: [{ id: "owner-1", email: "owner@example.com", role: "owner" }],
};

function mockRequests(overrides: Record<string, () => Response | Promise<Response>> = {}) {
  const fetcher = vi.fn(async (path: string) => {
    if (overrides[path]) return overrides[path]();
    const key = path.split("/").at(-1) as keyof typeof lists;
    return Response.json({ [key]: lists[key] });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

afterEach(() => vi.unstubAllGlobals());

describe("Studio workspace loading", () => {
  it("loads all sections for owners", async () => {
    mockRequests();
    expect(await loadStudioWorkspace()).toEqual({
      reviews: { state: "ready", items: lists.reviews },
      invitations: { state: "ready", items: lists.invitations },
      members: { state: "ready", items: lists.members },
    });
  });

  it("keeps members' reviews when owner-only sections deny access", async () => {
    const ownerOnly = () => Response.json({ error: "OWNER_REQUIRED" }, { status: 403 });
    mockRequests({ "/api/workspace/invitations": ownerOnly, "/api/workspace/members": ownerOnly });
    expect(await loadStudioWorkspace()).toEqual({
      reviews: { state: "ready", items: lists.reviews },
      invitations: { state: "restricted" },
      members: { state: "restricted" },
    });
  });

  it.each([
    ["network", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["service", () => Response.json({ error: "UNAVAILABLE" }, { status: 503 })],
    ["authentication", () => Response.json({ error: "AUTH_REQUIRED" }, { status: 401 })],
    ["unexpected permission", () => Response.json({ error: "UNEXPECTED" }, { status: 403 })],
    ["wrong status", () => Response.json({ error: "OWNER_REQUIRED" }, { status: 500 })],
    ["invalid JSON", () => new Response("not JSON")],
    ["invalid payload", () => Response.json({ invitations: null })],
  ])("reports %s failures without discarding successful sections", async (_name, fail) => {
    mockRequests({ "/api/workspace/invitations": fail });
    expect(await loadStudioWorkspace()).toEqual({
      reviews: { state: "ready", items: lists.reviews },
      invitations: { state: "error" },
      members: { state: "ready", items: lists.members },
    });
  });

  it("does not suppress an OWNER_REQUIRED error from the shared reviews endpoint", async () => {
    mockRequests({ "/api/reviews": () => Response.json({ error: "OWNER_REQUIRED" }, { status: 403 }) });
    const result = await loadStudioWorkspace();
    expect(result.reviews).toEqual({ state: "error" });
    expect(result.invitations).toEqual({ state: "ready", items: lists.invitations });
    expect(result.members).toEqual({ state: "ready", items: lists.members });
  });

  it("requests fresh data on retry after a partial failure", async () => {
    const requests = mockRequests({
      "/api/workspace/members": vi.fn()
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockImplementationOnce(() => Response.json({ members: lists.members })),
    });
    expect((await loadStudioWorkspace()).members).toEqual({ state: "error" });
    expect((await loadStudioWorkspace()).members).toEqual({ state: "ready", items: lists.members });
    expect(requests).toHaveBeenCalledTimes(6);
  });
});
