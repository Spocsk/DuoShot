// Content-addressed source uploads: `${userId}/${sha256}.${ext}`. Re-exporting the same
// screenshots reuses the stored object instead of uploading it again. The scheduled sweep
// deletes uploads 24 hours after creation unless a queued or running render job names them
// (see storage_cleanup_candidates). Between upload and enqueue nothing protects the object,
// so only objects younger than REUSE_MAX_AGE_MS are reused; an older copy is left to expire
// and the file goes to a fresh, timestamped path instead.

type UploadError = { status?: number; statusCode?: string | number; error?: string; message?: string };

/** The subset of a Supabase Storage bucket API this module needs. */
export type SourceBucket = {
  info(path: string): Promise<{ data: { createdAt?: string | null } | null; error: unknown }>;
  upload(path: string, file: Blob, options: { contentType: string; upsert: boolean }): Promise<{ error: UploadError | null }>;
};

/** Leaves 4 hours of margin before the 24-hour sweep for upload, queueing and rendering. */
export const REUSE_MAX_AGE_MS = 20 * 60 * 60 * 1000;

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

/** Same content, distinct object: used when the canonical copy is too old to reuse. */
export function freshUploadPath(path: string, now = Date.now()) {
  return path.replace(/\.([a-z]+)$/, `-${now}.$1`);
}

/** Storage answers a duplicate with HTTP 409, or 400 + statusCode "409" / "Duplicate" on older versions. */
export function isAlreadyExists(error: UploadError | null | undefined) {
  if (!error) return false;
  return error.status === 409 || String(error.statusCode) === "409" || error.error === "Duplicate" || /already exists/i.test(error.message ?? "");
}

export async function uploadSource(bucket: SourceBucket, userId: string, file: File, now = Date.now()) {
  const canonical = await sourceUploadPath(userId, file);
  let path = canonical;
  // Checking first saves the transfer; a failed check simply falls through to the upload.
  const existing = await bucket.info(canonical).catch(() => ({ data: null }));
  if (existing.data) {
    const created = Date.parse(existing.data.createdAt ?? "");
    if (Number.isFinite(created) && now - created < REUSE_MAX_AGE_MS) return canonical;
    path = freshUploadPath(canonical, now);
  }
  // upsert:false never overwrites, and the same file uploaded twice in parallel (outer and
  // inner sides) or by another tab resolves to "already exists", which is success here.
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error && !isAlreadyExists(error)) throw new Error("UPLOAD_FAILED");
  return path;
}
