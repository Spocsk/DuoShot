import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { assertBatchSize, MAX_SOURCE_BYTES, MAX_SOURCE_PIXELS } from "./limits";

export async function assertSourceImage(buffer: Buffer) {
  if (buffer.length > MAX_SOURCE_BYTES) throw new Error("INPUT_TOO_LARGE");
  const meta = await sharp(buffer, { limitInputPixels: MAX_SOURCE_PIXELS }).metadata();
  if (meta.format !== "png" && meta.format !== "jpeg") throw new Error("INPUT_FORMAT");
  if (!meta.width || !meta.height || meta.width * meta.height > MAX_SOURCE_PIXELS || (meta.pages ?? 1) > 1) throw new Error("INPUT_TOO_LARGE");
}

/** Unique paths are loaded once; serial reads cap peak buffering per render. */
export async function loadSources(client: SupabaseClient, userId: string, paths: string[]) {
  const unique = [...new Set(paths)];
  const bucket = client.storage.from("uploads");
  const metadata: { size: number }[] = [];
  for (const path of unique) {
    if (!path.startsWith(`${userId}/`)) throw new Error("PATH_FORBIDDEN");
    const { data, error } = await bucket.info(path);
    if (error || !data || typeof data.size !== "number") throw new Error("UPLOAD_MISSING");
    metadata.push({ size: data.size });
  }
  assertBatchSize(metadata);
  const buffers = new Map<string, Buffer>();
  const actual: { size: number }[] = [];
  for (const path of unique) {
    const { data, error } = await bucket.download(path);
    if (error || !data) throw new Error("UPLOAD_MISSING");
    actual.push({ size: data.size });
    assertBatchSize(actual);
    const buffer = Buffer.from(await data.arrayBuffer());
    await assertSourceImage(buffer);
    buffers.set(path, buffer);
  }
  return buffers;
}
