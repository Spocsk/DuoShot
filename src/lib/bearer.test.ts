import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWorkerSecret, resetRenderWorkerSecretWarning, verifyBearer } from "./bearer";

const request = (authorization?: string) =>
  new Request("http://127.0.0.1:3000/api/cron/storage-cleanup", authorization ? { headers: { authorization } } : {});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetRenderWorkerSecretWarning();
});

describe("verifyBearer", () => {
  it("accepts only the exact bearer secret", () => {
    expect(verifyBearer(request("Bearer s3cret"), "s3cret")).toBe(true);
    expect(verifyBearer(request("Bearer s3cre"), "s3cret")).toBe(false);
    expect(verifyBearer(request("Bearer s3cret-and-more"), "s3cret")).toBe(false);
    expect(verifyBearer(request("bearer s3cret"), "s3cret")).toBe(false);
    expect(verifyBearer(request("s3cret"), "s3cret")).toBe(false);
    expect(verifyBearer(request(), "s3cret")).toBe(false);
  });

  it("stays closed when the secret is unset or empty", () => {
    expect(verifyBearer(request("Bearer "), "")).toBe(false);
    expect(verifyBearer(request("Bearer undefined"), undefined)).toBe(false);
  });
});

describe("renderWorkerSecret", () => {
  it("prefers the dedicated worker secret without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("RENDER_WORKER_SECRET", "worker");
    vi.stubEnv("CRON_SECRET", "cron");
    expect(renderWorkerSecret()).toBe("worker");
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to CRON_SECRET during rollout and warns only once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("RENDER_WORKER_SECRET", "");
    vi.stubEnv("CRON_SECRET", "cron");
    expect(renderWorkerSecret()).toBe("cron");
    expect(renderWorkerSecret()).toBe("cron");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("returns nothing when neither secret is configured", () => {
    vi.stubEnv("RENDER_WORKER_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    expect(renderWorkerSecret()).toBeUndefined();
  });
});
