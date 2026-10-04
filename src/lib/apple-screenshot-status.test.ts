import { describe, expect, it } from "vitest";
import { APPLE_UPLOAD_STATE, APPLE_UPLOAD_STATUS_CHECKED_AT, appleUploadStatus } from "./apple-screenshot-status";

describe("Apple upload status", () => {
  it("defaults to the configured state", () => {
    expect(appleUploadStatus("fr")).toBe(appleUploadStatus("fr", APPLE_UPLOAD_STATE));
    expect(APPLE_UPLOAD_STATUS_CHECKED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("describes the pending state with the check date in both locales", () => {
    expect(appleUploadStatus("fr", "pending")).toBe("Vérifié le 27 septembre 2026 : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année. Préparez vos fichiers dès maintenant ; le dépôt dans App Store Connect sera manuel.");
    expect(appleUploadStatus("en", "pending")).toContain("Checked September 27, 2026: Apple says Duo screenshot uploads will open later this year.");
  });

  it("describes the open state in both locales", () => {
    const fr = appleUploadStatus("fr", "open");
    expect(fr).toContain("Vérifié le 27 septembre 2026 : Apple accepte maintenant les captures iPhone Duo dans App Store Connect");
    expect(fr).not.toContain("plus tard");
    const en = appleUploadStatus("en", "open");
    expect(en).toContain("Apple now accepts iPhone Duo screenshots in App Store Connect");
    expect(en).not.toContain("later this year");
  });
});
