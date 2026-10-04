import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "../env";

export type SealedSecret = { ciphertext: string; iv: string; authTag: string };

/**
 * Reads the 32-byte AES-256-GCM master key from ASC_ENCRYPTION_KEY (base64).
 * Returns null when it is missing or malformed so callers answer 503 instead of
 * ever storing a key with a weak or truncated master key.
 */
export function readMasterKey(value = serverEnv.asc.encryptionKey): Buffer | null {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.trim())) return null;
  const key = Buffer.from(value.trim(), "base64");
  return key.length === 32 ? key : null;
}

/** `context` (the workspace id) is bound as AAD so a row cannot be moved to another workspace. */
export function sealSecret(plaintext: string, key: Buffer, context: string): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

/** Throws ASC_KEY_UNREADABLE on any tampering, wrong context or wrong master key. */
export function openSecret(sealed: SealedSecret, key: Buffer, context: string): string {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("ASC_KEY_UNREADABLE");
  }
}
