// Content-addressed source uploads: `${userId}/${sha256}.${ext}`. Re-exporting the same
// screenshots reuses the stored object instead of uploading it again. The scheduled storage
// sweep keeps uploads named by a queued or running render job (see
// storage_cleanup_candidates), so reuse of an object close to its 24-hour expiry is safe once
// the job is queued.

type UploadError = { status?: number; statusCode?: string | number; error?: string; message?: string };

/** The subset of a Supabase Storage bucket API this module needs. */
export type SourceBucket = {
  exists(path: string): Promise<{ data: boolean; error: unknown }>;
  upload(path: string, file: Blob, options: { contentType: string; upsert: boolean }): Promise<{ error: UploadError | null }>;
};

export function sourceExtension(type: string) {
  return type === "image/png" ? "png" : "jpg";
}

/** Lower-case hex SHA-256, or null where Web Crypto is unavailable (non-secure contexts). */
export async function sha256Hex(data: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = new Uint8Array(await subtle.digest("SHA-256", data));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sourceUploadPath(userId: string, file: Blob) {
  const hash = await sha256Hex(await file.arrayBuffer());
  return `${userId}/${hash ?? crypto.randomUUID()}.${sourceExtension(file.type)}`;
}

/** Storage answers a duplicate with HTTP 409, or 400 + statusCode "409" / "Duplicate" on older versions. */
export function isAlreadyExists(error: UploadError | null | undefined) {
  if (!error) return false;
  return error.status === 409 || String(error.statusCode) === "409" || error.error === "Duplicate" || /already exists/i.test(error.message ?? "");
}

export async function uploadSource(bucket: SourceBucket, userId: string, file: File) {
  const path = await sourceUploadPath(userId, file);
  // Checking first saves the transfer; a failed check simply falls through to the upload.
  const existing = await bucket.exists(path).catch(() => ({ data: false }));
  if (existing.data) return path;
  // upsert:false never overwrites, and the same file uploaded twice in parallel (outer and
  // inner sides) or by another tab resolves to "already exists", which is success here.
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error && !isAlreadyExists(error)) throw new Error("UPLOAD_FAILED");
  return path;
}
