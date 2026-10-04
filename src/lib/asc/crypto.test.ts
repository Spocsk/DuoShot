import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { openSecret, readMasterKey, sealSecret } from "./crypto";

const key = randomBytes(32);
const secret = "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----";

describe("App Store Connect key sealing", () => {
  it("round-trips with a fresh IV each time and never stores the plaintext", () => {
    const first = sealSecret(secret, key, "ws-1");
    const second = sealSecret(secret, key, "ws-1");
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toContain("PRIVATE");
    expect(Buffer.from(first.iv, "base64")).toHaveLength(12);
    expect(Buffer.from(first.authTag, "base64")).toHaveLength(16);
    expect(openSecret(first, key, "ws-1")).toBe(secret);
  });

  it("detects tampering, another workspace and another master key", () => {
    const sealed = sealSecret(secret, key, "ws-1");
    const flipped = Buffer.from(sealed.ciphertext, "base64");
    flipped[0] = flipped[0]! ^ 1;
    expect(() => openSecret({ ...sealed, ciphertext: flipped.toString("base64") }, key, "ws-1")).toThrow("ASC_KEY_UNREADABLE");
    const tag = Buffer.from(sealed.authTag, "base64");
    tag[0] = tag[0]! ^ 1;
    expect(() => openSecret({ ...sealed, authTag: tag.toString("base64") }, key, "ws-1")).toThrow("ASC_KEY_UNREADABLE");
    expect(() => openSecret(sealed, key, "ws-2")).toThrow("ASC_KEY_UNREADABLE");
    expect(() => openSecret(sealed, randomBytes(32), "ws-1")).toThrow("ASC_KEY_UNREADABLE");
  });

  it("accepts only a 32-byte base64 master key", () => {
    expect(readMasterKey(key.toString("base64"))?.equals(key)).toBe(true);
    expect(readMasterKey(undefined)).toBeNull();
    expect(readMasterKey("")).toBeNull();
    expect(readMasterKey(randomBytes(16).toString("base64"))).toBeNull();
    expect(readMasterKey(randomBytes(48).toString("base64"))).toBeNull();
    expect(readMasterKey("not base64 at all!")).toBeNull();
  });
});
