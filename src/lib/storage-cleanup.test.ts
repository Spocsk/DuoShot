import { describe, expect, it, vi } from "vitest";
import { removeStorageObjects } from "./storage-cleanup";

type Candidate = { bucket_id: string; name: string };
function admin(batches: Array<Candidate[] | { error: unknown }>, removeError: unknown = null) {
  const rpc = vi.fn(async () => {
    const batch = batches.shift() ?? [];
    return Array.isArray(batch) ? { data: batch, error: null } : { data: null, error: batch.error };
  });
  const remove = vi.fn(async (bucket: string, paths: string[]) => ({ data: paths.map((name) => ({ bucket, name })), error: removeError }));
  const client = { rpc, storage: { from: (bucket: string) => ({ remove: (paths: string[]) => remove(bucket, paths) }) } };
  return { client: client as never, rpc, remove };
}

describe("removeStorageObjects", () => {
  it("scans globally by default and stops on an empty batch", async () => {
    const { client, rpc, remove } = admin([[]]);
    expect(await removeStorageObjects(client)).toEqual({ removed: 0, complete: true });
    expect(rpc).toHaveBeenCalledWith("storage_cleanup_candidates", { p_user_id: null });
    expect(remove).not.toHaveBeenCalled();
  });

  it("scopes the scan to one user when asked", async () => {
    const { client, rpc } = admin([[]]);
    await removeStorageObjects(client, "user-1");
    expect(rpc).toHaveBeenCalledWith("storage_cleanup_candidates", { p_user_id: "user-1" });
  });

  it("removes each batch bucket by bucket and ignores unknown buckets", async () => {
    const { client, rpc, remove } = admin([
      [
        { bucket_id: "uploads", name: "user-1/a.png" },
        { bucket_id: "exports", name: "user-1/set.zip" },
        { bucket_id: "uploads", name: "user-1/b.png" },
        { bucket_id: "avatars", name: "user-1/me.png" },
      ],
      [{ bucket_id: "reviews", name: "pub-1/pair.jpg" }],
      [],
    ]);
    expect(await removeStorageObjects(client)).toEqual({ removed: 4, complete: true });
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(remove.mock.calls).toEqual([
      ["uploads", ["user-1/a.png", "user-1/b.png"]],
      ["exports", ["user-1/set.zip"]],
      ["reviews", ["pub-1/pair.jpg"]],
    ]);
  });

  it("gives up after 20 batches and reports the sweep as incomplete", async () => {
    const batch = [{ bucket_id: "uploads", name: "user-1/a.png" }];
    const { client, rpc } = admin(Array.from({ length: 25 }, () => batch));
    expect(await removeStorageObjects(client)).toEqual({ removed: 20, complete: false });
    expect(rpc).toHaveBeenCalledTimes(20);
  });

  it("throws when the scan or a removal fails", async () => {
    await expect(removeStorageObjects(admin([{ error: { message: "boom" } }]).client)).rejects.toThrow("STORAGE_SCAN_FAILED");
    const failing = admin([[{ bucket_id: "exports", name: "x.zip" }]], { message: "denied" });
    await expect(removeStorageObjects(failing.client)).rejects.toThrow("STORAGE_DELETE_FAILED");
    expect(failing.rpc).toHaveBeenCalledTimes(1);
  });
});
