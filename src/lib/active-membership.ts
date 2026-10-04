import type { User } from "@supabase/supabase-js";
import type { DbClient } from "@/lib/supabase/types";

export type ActiveMembership = { workspace_id: string; role: string };

/**
 * The signed-in user's active workspace membership. A failed lookup is reported
 * separately so callers never mistake a database outage for "no workspace".
 */
export async function readActiveMembership(supabase: DbClient, userId: string):
  Promise<{ failed: true; membership: null } | { failed: false; membership: ActiveMembership | null }> {
  const { data, error } = await supabase.from("workspace_members")
    .select("workspace_id, role").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
  if (error) return { failed: true, membership: null };
  return { failed: false, membership: data };
}

export type MembershipGate =
  | { ok: true; user: User; membership: ActiveMembership }
  | { ok: false; response: Response };

/**
 * Route guard: signed-in user with an active membership (and the given role).
 * 401 AUTH_REQUIRED, 503 WORKSPACE_UNAVAILABLE, then 403 OWNER_REQUIRED when a
 * role is required, else 409 NO_WORKSPACE. Uses Response (not NextResponse) so
 * the render worker can bundle this module.
 */
export async function requireMembership(supabase: DbClient, options: { role?: "owner" } = {}): Promise<MembershipGate> {
  const deny = (error: string, status: number) => ({ ok: false as const, response: Response.json({ error }, { status }) });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return deny("AUTH_REQUIRED", 401);
  const lookup = await readActiveMembership(supabase, user.id);
  if (lookup.failed) return deny("WORKSPACE_UNAVAILABLE", 503);
  const { membership } = lookup;
  if (options.role && membership?.role !== options.role) return deny("OWNER_REQUIRED", 403);
  if (!membership) return deny("NO_WORKSPACE", 409);
  return { ok: true, user, membership };
}
