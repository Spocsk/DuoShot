import { afterEach, describe, expect, it, vi } from "vitest";
import { isAlreadyExists, sha256Hex, sourceUploadPath, uploadSource, type SourceBucket } from "./source-upload";

const USER = "00000000-0000-4000-8000-000000000001";
// SHA-256("abc"), from FIPS 180-2.
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const png = (text = "abc") => new File([text], "shot.png", { type: "image/png" });

function bucket(options: { exists?: boolean | Error; uploadError?: Record<string, unknown> | null } = {}) {
  const upload = vi.fn(async () => ({ error: (options.uploadError ?? null) as never }));
  const exists = vi.fn(async () => {
    if (options.exists instanceof Error) throw options.exists;
    return { data: Boolean(options.exists), error: null };
  });
  return { bucket: { exists, upload } as SourceBucket, upload, exists };
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
  it("skips the transfer when the object already exists", async () => {
    const { bucket: target, upload } = bucket({ exists: true });
    expect(await uploadSource(target, USER, png())).toBe(`${USER}/${ABC}.png`);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads without overwriting when the object is new", async () => {
    const { bucket: target, upload } = bucket();
    const file = png();
    expect(await uploadSource(target, USER, file)).toBe(`${USER}/${ABC}.png`);
    expect(upload).toHaveBeenCalledWith(`${USER}/${ABC}.png`, file, { contentType: "image/png", upsert: false });
  });

  it("treats a concurrent duplicate as success and a failed existence check as 'upload'", async () => {
    const { bucket: target, upload } = bucket({ exists: new Error("network"), uploadError: { status: 409, message: "The resource already exists" } });
    expect(await uploadSource(target, USER, png())).toBe(`${USER}/${ABC}.png`);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("reports any other upload error", async () => {
    const { bucket: target } = bucket({ uploadError: { status: 413, message: "Payload too large" } });
    await expect(uploadSource(target, USER, png())).rejects.toThrow("UPLOAD_FAILED");
  });
});
