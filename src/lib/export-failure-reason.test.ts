import { describe, expect, it } from "vitest";
import { exportFailureReason } from "./export-failure-reason";

describe("exportFailureReason", () => {
  it("returns known codes verbatim", () => {
    for (const code of [
      "AUTH_REQUIRED",
      "IPHONE_69_GATED",
      "TRIAL_EXHAUSTED",
      "QUALITY_ACK_REQUIRED",
      "CLONE_RISK",
      "DUO_SELECTION_EMPTY",
      "INPUT_TOO_LARGE",
      "UPLOAD_FAILED",
      "RENDER_PENDING",
      "STORAGE_UNAVAILABLE",
      "NO_WORKSPACE",
    ]) {
      expect(exportFailureReason(code)).toBe(code);
    }
  });

  it("maps raw browser error messages to network_or_storage", () => {
    expect(exportFailureReason("Load failed")).toBe("network_or_storage");
    expect(exportFailureReason("TypeError: Failed to fetch")).toBe("network_or_storage");
    expect(exportFailureReason("NetworkError when attempting to fetch resource.")).toBe("network_or_storage");
  });

  it("maps undefined and unknown codes to network_or_storage", () => {
    expect(exportFailureReason(undefined)).toBe("network_or_storage");
    expect(exportFailureReason(null)).toBe("network_or_storage");
    expect(exportFailureReason("")).toBe("network_or_storage");
    expect(exportFailureReason("SOMETHING_ELSE")).toBe("network_or_storage");
  });
});
