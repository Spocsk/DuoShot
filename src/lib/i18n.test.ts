import { describe, expect, it } from "vitest";
import { i18nKeys, t, tf } from "./i18n";

describe("i18n", () => {
  it("keeps the same keys in French and English", () => {
    const { fr, en } = i18nKeys();
    expect(fr.sort()).toEqual(en.sort());
    expect(fr.length).toBeGreaterThan(50);
  });

  it("interpolates placeholders", () => {
    expect(tf("fr", "account_remaining", { n: 2 })).toBe("2 ZIP offerts restants");
    expect(tf("en", "account_remaining", { n: 1 })).toBe("1 free ZIPs left");
    expect(t("fr", "tool_download")).toBe("Télécharger le ZIP");
    expect(t("en", "tool_download")).toBe("Download ZIP");
    expect(t("fr", "tool_crop_drag_hint")).toContain("PNG exporté");
    expect(t("en", "tool_crop_drag_hint")).toContain("exported PNG");
  });
});
