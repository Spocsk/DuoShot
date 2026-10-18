import { afterEach, describe, expect, it, vi } from "vitest";
import { serverEnv } from "../env";
import { ascUploadModel } from "./config";

afterEach(() => vi.unstubAllEnvs());
describe("ASC_UPLOAD_MODEL", () => {
  it.each([undefined, "", "legacy", "typo", "ASSET-LIBRARY", " asset-library "])("defaults to legacy for %s", (value) => {
    vi.stubEnv("ASC_UPLOAD_MODEL", value);
    expect(serverEnv.asc.uploadModel).toBe("legacy");
    expect(ascUploadModel()).toBe("legacy");
  });
  it("reads asset-library dynamically without enabling the connector", () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "false");
    vi.stubEnv("ASC_UPLOAD_MODEL", "asset-library");
    expect(ascUploadModel()).toBe("asset-library");
    expect(serverEnv.asc.enabled).toBe(false);
    vi.stubEnv("ASC_UPLOAD_MODEL", "legacy");
    expect(ascUploadModel()).toBe("legacy");
  });
});
