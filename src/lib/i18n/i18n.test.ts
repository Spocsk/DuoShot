import { describe, expect, it } from "vitest";
import { en as enMessages } from "./en";
import { fr as frMessages } from "./fr";
import { getTranslator } from "./index";

const fr = getTranslator("fr");
const en = getTranslator("en");

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  it("keeps the same keys in French and English", () => {
    const frKeys = Object.keys(frMessages).sort();
    expect(Object.keys(enMessages).sort()).toEqual(frKeys);
    expect(frKeys.length).toBeGreaterThan(50);
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of Object.keys(frMessages) as (keyof typeof frMessages)[]) {
      expect(placeholders(enMessages[key]), key).toEqual(placeholders(frMessages[key]));
    }
  });

  it("interpolates placeholders", () => {
    expect(fr.tf("account_remaining", { n: 2 })).toBe("2 ZIP offerts restants");
    expect(en.tf("account_remaining", { n: 1 })).toBe("1 free ZIP left");
    expect(fr.tf("account_remaining", { n: 1 })).toBe("1 ZIP offert restant");
    expect(en.tf("tool_quality_gate_title", { n: 1 })).toBe("1 crop needs review");
    expect(fr.tf("tool_quality_gate_title", { n: 3 })).toBe("3 cadrages à vérifier");
    expect(fr.t("tool_download")).toBe("Télécharger le ZIP");
    expect(en.t("tool_download")).toBe("Download ZIP");
    expect(fr.t("tool_crop_drag_hint")).toContain("PNG exporté");
    expect(en.t("tool_crop_drag_hint")).toContain("exported PNG");
    expect(fr.t("tool_crop_device_hint")).toContain("164,6");
    expect(en.t("tool_crop_device_hint")).toContain("164.6");
  });

  it("picks the singular variant with Intl.PluralRules", () => {
    // French treats 0 as singular, English does not.
    expect(fr.tf("account_remaining", { n: 0 })).toBe(fr.tf("account_remaining", { n: 1 }).replace("1", "0"));
    expect(en.tf("account_remaining", { n: 0 })).toBe("0 free ZIPs left");
  });
});
