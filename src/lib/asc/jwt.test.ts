import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isIssuerId, isKeyId, normalizeAscPrivateKeyPem, parseAscPrivateKey, signAscToken } from "./jwt";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const credentials = { issuerId: "57246542-96fe-1a63-e053-0824d011072a", keyId: "2X9R4HXF34", privateKey: pem };
const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("App Store Connect JWT", () => {
  it("signs ES256 with Apple's header and claims, valid for at most 20 minutes", () => {
    const token = signAscToken(credentials, 1_800_000_000);
    const [header, payload, signature] = token.split(".");
    expect(decode(header!)).toEqual({ alg: "ES256", kid: "2X9R4HXF34", typ: "JWT" });
    const claims = decode(payload!);
    expect(claims).toEqual({ iss: credentials.issuerId, iat: 1_800_000_000, exp: 1_800_000_900, aud: "appstoreconnect-v1" });
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(20 * 60);
    const raw = Buffer.from(signature!, "base64url");
    // JOSE ES256 is the raw 64-byte r||s pair; a DER signature would be rejected by Apple.
    expect(raw).toHaveLength(64);
    expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, raw)).toBe(true);
  });

  it("refuses lifetimes Apple would reject", () => {
    expect(() => signAscToken(credentials, 0, 21 * 60)).toThrow("ASC_TOKEN_TTL");
  });

  it("accepts only P-256 PKCS#8 keys", () => {
    expect(parseAscPrivateKey(pem).asymmetricKeyType).toBe("ec");
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
    const p384 = generateKeyPairSync("ec", { namedCurve: "secp384r1" }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
    for (const bad of [rsa, p384, "not a key", "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----", 42, null, pem + pem, pem.repeat(30)]) {
      expect(() => parseAscPrivateKey(bad)).toThrow("ASC_KEY_INVALID");
    }
  });

  it("accepts a .p8 whose newlines were stripped (pasted / env-flattened on one line)", () => {
    // Apple's own .p8 is multi-line; a common failure is pasting it as a single
    // ~250-char line (headers glued to the base64, no newlines at all).
    const oneLine = pem.replace(/\r?\n/g, "");
    expect(oneLine.includes("\n")).toBe(false);
    expect(oneLine).toContain("-----BEGIN PRIVATE KEY-----");

    // It must parse to the same P-256 key, and signing with it must verify.
    expect(parseAscPrivateKey(oneLine).asymmetricKeyType).toBe("ec");
    const token = signAscToken({ ...credentials, privateKey: oneLine }, 1_800_000_000);
    const [header, payload, signature] = token.split(".");
    expect(verify("sha256", Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature!, "base64url"))).toBe(true);

    // Bare base64 with no header at all is rebuilt too.
    const bodyOnly = oneLine.replace(/-----[^-]+-----/g, "");
    expect(parseAscPrivateKey(bodyOnly).asymmetricKeyType).toBe("ec");
  });

  it("leaves a real multi-line PEM untouched and never mangles multi-key input", () => {
    expect(normalizeAscPrivateKeyPem(`\n${pem}\n`)).toBe(pem.trim());
    // Two keys concatenated keep their newlines, so the strict single-key gate still rejects them.
    expect(() => parseAscPrivateKey(pem + pem)).toThrow("ASC_KEY_INVALID");
  });

  it("validates issuer and key ids", () => {
    expect(isIssuerId(credentials.issuerId)).toBe(true);
    expect(isIssuerId("57246542")).toBe(false);
    expect(isKeyId("2X9R4HXF34")).toBe(true);
    expect(isKeyId("2x9r4hxf34")).toBe(false);
    expect(isKeyId("2X9R4HXF3")).toBe(false);
  });
});
