import type { SupabaseClient } from "@supabase/supabase-js";

/** Select metadata in SQL, delete physical objects only through Storage. */
export async function removeStorageObjects(admin: SupabaseClient, userId: string | null = null) {
  let removed = 0;
  for (let batch = 0; batch < 20; batch++) {
    const { data, error } = await admin.rpc("storage_cleanup_candidates", { p_user_id: userId });
    if (error) throw new Error("STORAGE_SCAN_FAILED");
    const objects = (data ?? []) as Array<{ bucket_id: string; name: string }>;
    if (!objects.length) return { removed, complete: true };
    for (const bucket of ["uploads", "exports", "reviews"]) {
      const paths = objects.filter((object) => object.bucket_id === bucket).map((object) => object.name);
      if (!paths.length) continue;
      const result = await admin.storage.from(bucket).remove(paths);
      if (result.error) throw new Error("STORAGE_DELETE_FAILED");
      removed += paths.length;
    }
  }
  return { removed, complete: false };
}
