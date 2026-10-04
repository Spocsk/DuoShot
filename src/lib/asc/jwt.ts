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
 * Parses an App Store Connect .p8 file: a PKCS#8 PEM holding a P-256 EC key.
 * Throws ASC_KEY_INVALID for anything else, without echoing the input.
 */
export function parseAscPrivateKey(pem: unknown): KeyObject {
  if (typeof pem !== "string" || pem.length > MAX_PEM_BYTES || pem.split("-----BEGIN ").length !== 2 || !pem.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("ASC_KEY_INVALID");
  }
  let key: KeyObject;
  try { key = createPrivateKey({ key: pem.trim(), format: "pem" }); } catch { throw new Error("ASC_KEY_INVALID"); }
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
