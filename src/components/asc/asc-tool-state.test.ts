import { describe, expect, it } from "vitest";
import { getTranslator } from "@/lib/i18n";
import {
  ascAppUrl, ascErrorKey, ascFileErrorKey, ascFilePlan, ascFileStateKey, ascGate, autoPick, type ExportImage,
} from "./asc-tool-state";

const fr = getTranslator("fr");
const en = getTranslator("en");

const image = (slot: string, index: number, width: number, height: number): ExportImage => ({ slot, index, width, height, format: "png" });

describe("ascGate", () => {
  it("hides the action when the connector flag is off or the status is unknown", () => {
    expect(ascGate(null)).toBe("hidden");
  });

  it("locks trial and free workspaces even without a connection", () => {
    expect(ascGate({ paid: false, connected: false, owner: true })).toBe("locked");
    expect(ascGate({ paid: false, connected: true, owner: true })).toBe("locked");
  });

  it("asks paid workspaces without a key to connect, and opens the dialog otherwise", () => {
    expect(ascGate({ paid: true, connected: false, owner: false })).toBe("not_connected");
    expect(ascGate({ paid: true, connected: true, owner: false })).toBe("ready");
  });
});

describe("ascFilePlan", () => {
  it("sends only the largest 6.9″ size, in slide order, and skips every Duo file", () => {
    const plan = ascFilePlan([
      image("duo-outer", 1, 1398, 2034), image("duo-inner", 1, 2007, 2853),
      image("iphone-69", 2, 1320, 2868), image("iphone-69", 2, 1290, 2796), image("iphone-69", 1, 1260, 2736),
      image("iphone-69", 1, 1320, 2868), image("duo-outer", 2, 1398, 2034), image("duo-inner", 2, 2007, 2853),
    ], "portrait");
    expect(plan.send.map((file) => file.name)).toEqual(["iphone-69-portrait/1320x2868/01.png", "iphone-69-portrait/1320x2868/02.png"]);
    expect(plan.skipped.map((file) => file.name)).toEqual([
      "duo-outer-portrait/01.png", "duo-outer-portrait/02.png", "duo-inner-portrait/01.png", "duo-inner-portrait/02.png",
    ]);
  });

  it("uses the landscape size in landscape and caps a set at ten", () => {
    const images = Array.from({ length: 12 }, (_, index) => image("iphone-69", index + 1, 2868, 1320));
    const plan = ascFilePlan([...images, image("iphone-69", 1, 1320, 2868)], "landscape");
    expect(plan.send).toHaveLength(10);
    expect(plan.send[0]!.name).toBe("iphone-69-landscape/2868x1320/01.png");
  });

  it("has nothing to send for a Duo-only export", () => {
    const plan = ascFilePlan([image("duo-outer", 1, 1398, 2034), image("duo-inner", 1, 2007, 2853)], "portrait");
    expect(plan.send).toEqual([]);
    expect(plan.skipped).toHaveLength(2);
  });
});

describe("error and state messages", () => {
  it("translates stable codes and falls back to a generic message", () => {
    expect(fr.t(ascErrorKey("ASC_SET_FULL"))).toContain("10 au maximum");
    expect(fr.t(ascErrorKey("ASC_UNAUTHORIZED"))).toContain("Reconnectez");
    expect(en.t(ascErrorKey("EXPORT_EXPIRED"))).toContain("expired");
    expect(ascErrorKey("SOMETHING_NEW")).toBe("asct_err_generic");
    expect(ascErrorKey(undefined)).toBe("asct_err_generic");
  });

  it("explains rollback and cleanup failures per file", () => {
    expect(ascFileErrorKey("ASC_ROLLED_BACK")).toBe("asct_file_rolled_back");
    expect(fr.t(ascFileErrorKey("ASC_CLEANUP_FAILED"))).toContain("vérifiez la fiche");
    expect(ascFileErrorKey("ASC_PROCESSING_FAILED")).toBe("asct_err_processing");
  });

  it("labels each file state", () => {
    expect(["pending", "uploading", "processing", "complete", "failed"].map(ascFileStateKey)).toEqual([
      "asct_file_pending", "asct_file_uploading", "asct_file_processing", "asct_file_complete", "asct_file_failed",
    ]);
  });

  it("keeps the skipped reason and the plural forms", () => {
    expect(fr.t("asct_skipped_reason")).toBe("Apple n’accepte pas encore les captures iPhone Duo dans l’API");
    expect(fr.tf("asct_confirm", { n: 1 })).toBe("Envoyer 1 capture");
    expect(fr.tf("asct_confirm", { n: 3 })).toBe("Envoyer 3 captures");
    expect(en.tf("asct_success_body", { n: 1 })).toBe("1 6.9″ screenshot is in App Store Connect.");
  });
});

describe("helpers", () => {
  it("links to the app in App Store Connect", () => {
    expect(ascAppUrl("1234567890")).toBe("https://appstoreconnect.apple.com/apps/1234567890");
  });

  it("picks a lone option only", () => {
    expect(autoPick([{ id: "a" }])).toBe("a");
    expect(autoPick([{ id: "a" }, { id: "b" }])).toBe("");
    expect(autoPick([])).toBe("");
  });
});
