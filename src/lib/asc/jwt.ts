import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { ASC_AUDIENCE, ASC_TOKEN_TTL_SECONDS } from "./config";

export type AscCredentials = { issuerId: string; keyId: string; privateKey: string };

const ISSUER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_ID = /^[A-Z0-9]{10}$/;
const MAX_PEM_BYTES = 4096;

export function isIssuerId(value: unknown): value is string {
  return typeof value === "string" && ISSUER_ID.test(value);
}

export function isKeyId(value: unknown): value is string {
  return typeof value === "string" && KEY_ID.test(value);
}

/**
 * Rebuilds a usable PKCS#8 PEM when the .p8 lost its line breaks — e.g. pasted
 * as a single line, or carried through an env var / form field that stripped
 * newlines. OpenSSL needs the BEGIN/END boundaries on their own lines and the
 * base64 wrapped; a key glued onto one line is valid material but unparseable
 * as-is. A PEM that already has real newlines is returned untouched (trimmed),
 * so multi-key or malformed multi-line input still reaches the strict checks.
 */
export function normalizeAscPrivateKeyPem(pem: string): string {
  if (pem.includes("\n")) return pem.trim();
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----\n`;
}

/**
 * Parses an App Store Connect .p8 file: a PKCS#8 PEM holding a P-256 EC key.
 * Accepts a key whose newlines were lost (rebuilt first). Throws ASC_KEY_INVALID
 * for anything else, without echoing the input.
 */
export function parseAscPrivateKey(pem: unknown): KeyObject {
  if (typeof pem !== "string" || pem.length > MAX_PEM_BYTES) throw new Error("ASC_KEY_INVALID");
  const normalized = normalizeAscPrivateKeyPem(pem);
  if (normalized.split("-----BEGIN ").length !== 2 || !normalized.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("ASC_KEY_INVALID");
  }
  let key: KeyObject;
  try { key = createPrivateKey({ key: normalized, format: "pem" }); } catch { throw new Error("ASC_KEY_INVALID"); }
  if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
    throw new Error("ASC_KEY_INVALID");
  }
  return key;
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

/** ES256 JWT for the App Store Connect API (team key: iss + kid). */
export function signAscToken(credentials: AscCredentials, now = Math.floor(Date.now() / 1000), ttl = ASC_TOKEN_TTL_SECONDS): string {
  if (ttl > 20 * 60) throw new Error("ASC_TOKEN_TTL");
  const key = parseAscPrivateKey(credentials.privateKey);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: credentials.keyId, typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: credentials.issuerId, iat: now, exp: now + ttl, aud: ASC_AUDIENCE }));
  // JOSE requires the raw 64-byte r||s signature, not DER.
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${base64url(signature)}`;
}
