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
