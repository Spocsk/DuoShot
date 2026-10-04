import type { DbClient } from "@/lib/supabase/types";
import { openSecret, readMasterKey } from "./crypto";
import type { AscCredentials } from "./jwt";

/**
 * Decrypts the workspace key for server-side use only. Null when no connection exists.
 * Kept free of Next imports: the standalone render worker loads it outside Next.
 */
export async function loadAscCredentials(admin: DbClient, workspaceId: string): Promise<AscCredentials | null> {
  const { data, error } = await admin.from("asc_connections")
    .select("issuer_id, key_id, encrypted_private_key, iv, auth_tag").eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw new Error("ASC_UNAVAILABLE");
  if (!data) return null;
  const key = readMasterKey();
  if (!key) throw new Error("ASC_UNAVAILABLE");
  const privateKey = openSecret({ ciphertext: data.encrypted_private_key, iv: data.iv, authTag: data.auth_tag }, key, workspaceId);
  return { issuerId: data.issuer_id, keyId: data.key_id, privateKey };
}
