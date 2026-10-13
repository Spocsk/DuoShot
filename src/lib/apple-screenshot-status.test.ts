import { describe, expect, it } from "vitest";
import { APPLE_UPLOAD_NEWS_SOURCE, APPLE_UPLOAD_STATE, APPLE_UPLOAD_STATUS_CHECKED_AT, appleUploadStatus } from "./apple-screenshot-status";

describe("Apple upload status", () => {
  it("defaults to the configured state", () => {
    expect(appleUploadStatus("fr")).toBe(appleUploadStatus("fr", APPLE_UPLOAD_STATE));
    expect(APPLE_UPLOAD_STATUS_CHECKED_AT).toBe("2026-10-13");
    expect(APPLE_UPLOAD_STATE).toBe("open");
    expect(APPLE_UPLOAD_NEWS_SOURCE).toBe("https://developer.apple.com/news/?id=kkphp5qo");
  });

  it("describes the pending state with the check date in both locales", () => {
    expect(appleUploadStatus("fr", "pending")).toBe("Vérifié le 13 octobre 2026 : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année. Préparez vos fichiers dès maintenant ; le dépôt dans App Store Connect sera manuel.");
    expect(appleUploadStatus("en", "pending")).toContain("Checked October 13, 2026: Apple says Duo screenshot uploads will open later this year.");
  });

  it("describes the open state in both locales", () => {
    const fr = appleUploadStatus("fr", "open");
    expect(fr).toBe("Vérifié le 13 octobre 2026 : le dépôt des captures d’écran iPhone Duo est ouvert dans App Store Connect depuis le 5 octobre 2026. Ces captures seront exigées pour toute soumission à partir d’avril 2027. Déposez manuellement vos captures écran fermé et écran ouvert depuis la fiche de votre app.");
    expect(fr).not.toContain("plus tard");
    const en = appleUploadStatus("en", "open");
    expect(en).toBe("Checked October 13, 2026: iPhone Duo screenshot uploads have been open in App Store Connect since October 5, 2026. Duo screenshots become required for every submission from April 2027. Upload your closed and open screen files manually from your app’s listing.");
    expect(en).not.toContain("later this year");
  });
});
