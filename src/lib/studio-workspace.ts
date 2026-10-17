export type ReviewSummary = {
  public_id: string;
  set_name: string;
  client_name: string | null;
  status: string;
  expiresAt: string | null;
};

export type Invitation = {
  id: string;
  email: string;
  expires_at: string;
  accepted_at?: string | null;
  revoked_at?: string | null;
};

export type WorkspaceMember = {
  id: string;
  email: string | null;
  role: "owner" | "member";
};

type StudioLists = {
  reviews: ReviewSummary[];
  invitations: Invitation[];
  members: WorkspaceMember[];
};

type ListResult<T> =
  | { state: "ready"; items: T }
  | { state: "restricted" }
  | { state: "error" };

async function loadList<K extends keyof StudioLists>(path: string, key: K): Promise<ListResult<StudioLists[K]>> {
  try {
    const response = await fetch(path);
    const payload = await response.json() as Partial<StudioLists> & { error?: string };
    // Reviews are shared with all members; team management is owner-only.
    if (key !== "reviews" && response.status === 403 && payload.error === "OWNER_REQUIRED") {
      return { state: "restricted" };
    }
    if (!response.ok || !Array.isArray(payload[key])) return { state: "error" };
    return { state: "ready", items: payload[key] as StudioLists[K] };
  } catch {
    return { state: "error" };
  }
}

/** Keep successful sections available even when another section cannot load. */
export async function loadStudioWorkspace() {
  const [reviews, invitations, members] = await Promise.all([
    loadList("/api/reviews", "reviews"),
    loadList("/api/workspace/invitations", "invitations"),
    loadList("/api/workspace/members", "members"),
  ]);
  return { reviews, invitations, members };
}
