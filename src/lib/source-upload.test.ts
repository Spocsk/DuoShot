import { afterEach, describe, expect, it, vi } from "vitest";
import { REUSE_MAX_AGE_MS, isAlreadyExists, sha256Hex, sourceUploadPath, uploadSource, type SourceBucket } from "./source-upload";

const USER = "00000000-0000-4000-8000-000000000001";
// SHA-256("abc"), from FIPS 180-2.
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const png = (text = "abc") => new File([text], "shot.png", { type: "image/png" });

const NOW = Date.parse("2026-10-04T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

/** `existing` is the canonical object's createdAt, or an Error thrown by the lookup. */
function bucket(options: { existing?: string | Error; uploadError?: Record<string, unknown> | null } = {}) {
  const upload = vi.fn(async () => ({ error: (options.uploadError ?? null) as never }));
  const info = vi.fn(async () => {
    if (options.existing instanceof Error) throw options.existing;
    return options.existing ? { data: { createdAt: options.existing }, error: null } : { data: null, error: { status: 404 } };
  });
  return { bucket: { info, upload } as SourceBucket, upload, info };
}

afterEach(() => vi.unstubAllGlobals());

describe("source upload paths", () => {
  it("hashes the bytes with SHA-256", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc").buffer as ArrayBuffer)).toBe(ABC);
  });

  it("names the object after the content and the image type", async () => {
    expect(await sourceUploadPath(USER, png())).toBe(`${USER}/${ABC}.png`);
    expect(await sourceUploadPath(USER, new File(["abc"], "shot.jpeg", { type: "image/jpeg" }))).toBe(`${USER}/${ABC}.jpg`);
    // Same bytes, same path; different bytes, different path.
    expect(await sourceUploadPath(USER, png())).toBe(await sourceUploadPath(USER, png()));
    expect(await sourceUploadPath(USER, png("abd"))).not.toBe(`${USER}/${ABC}.png`);
  });

  it("falls back to a random name where Web Crypto is unavailable", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" });
    expect(await sourceUploadPath(USER, png())).toBe(`${USER}/11111111-2222-4333-8444-555555555555.png`);
  });

  it("recognizes every duplicate shape Storage returns", () => {
    expect(isAlreadyExists({ status: 409 })).toBe(true);
    expect(isAlreadyExists({ status: 400, statusCode: "409", error: "Duplicate", message: "The resource already exists" })).toBe(true);
    expect(isAlreadyExists({ status: 403, statusCode: "403", message: "new row violates row-level security policy" })).toBe(false);
    expect(isAlreadyExists(null)).toBe(false);
  });
});

describe("uploadSource", () => {
  it("skips the transfer when a recent copy already exists", async () => {
    const { bucket: target, upload } = bucket({ existing: ago(REUSE_MAX_AGE_MS - 60_000) });
    expect(await uploadSource(target, USER, png(), NOW)).toBe(`${USER}/${ABC}.png`);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads to a fresh path when the stored copy is close to the 24-hour sweep", async () => {
    for (const createdAt of [ago(REUSE_MAX_AGE_MS), ago(23.9 * 60 * 60 * 1000), "not a date"]) {
      const { bucket: target, upload } = bucket({ existing: createdAt });
      const file = png();
      expect(await uploadSource(target, USER, file, NOW)).toBe(`${USER}/${ABC}-${NOW}.png`);
      expect(upload).toHaveBeenCalledWith(`${USER}/${ABC}-${NOW}.png`, file, { contentType: "image/png", upsert: false });
    }
  });

  it("uploads without overwriting when the object is new", async () => {
    const { bucket: target, upload } = bucket();
    const file = png();
    expect(await uploadSource(target, USER, file)).toBe(`${USER}/${ABC}.png`);
    expect(upload).toHaveBeenCalledWith(`${USER}/${ABC}.png`, file, { contentType: "image/png", upsert: false });
  });

  it("treats a concurrent duplicate as success and a failed existence check as 'upload'", async () => {
    const { bucket: target, upload } = bucket({ existing: new Error("network"), uploadError: { status: 409, message: "The resource already exists" } });
    expect(await uploadSource(target, USER, png())).toBe(`${USER}/${ABC}.png`);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("reports any other upload error", async () => {
    const { bucket: target } = bucket({ uploadError: { status: 413, message: "Payload too large" } });
    await expect(uploadSource(target, USER, png())).rejects.toThrow("UPLOAD_FAILED");
  });
});
