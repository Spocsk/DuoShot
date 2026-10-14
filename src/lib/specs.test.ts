import { describe, expect, it } from "vitest";
import { connectPreviewStyle, duoChassisAspect, duoSpec, formatInches, SIZE_SPECS, specRowDetail, targetsFor } from "./specs";

describe("6.3-inch export preset", () => {
  it.each(["free", "indie", "studio"] as const)("is available on %s with portrait and landscape pixels", (plan) => {
    for (const orientation of ["portrait", "landscape"] as const) {
      const targets = targetsFor({ orientation, include63: true, include69: false, plan });
      expect(targets.map((spec) => [spec.slot, spec.width, spec.height])).toEqual(orientation === "portrait"
        ? [["duo-outer", 1398, 2034], ["duo-inner", 2007, 2853], ["iphone-63", 1206, 2622]]
        : [["duo-outer", 2034, 1398], ["duo-inner", 2853, 2007], ["iphone-63", 2622, 1206]]);
      expect(targets.find((spec) => spec.slot === "iphone-63")?.gated).toBeUndefined();
    }
  });

  it("is opt-in and preserves the 6.9-inch gate", () => {
    expect(targetsFor({ orientation: "portrait", include69: false, plan: "free" })).toHaveLength(2);
    expect(() => targetsFor({ orientation: "portrait", include63: true, include69: true, plan: "free" })).toThrow("IPHONE_69_GATED");
    const paid = targetsFor({ orientation: "portrait", include63: true, include69: true, plan: "indie" });
    expect(paid.filter((spec) => spec.slot === "iphone-63")).toHaveLength(1);
    expect(paid.filter((spec) => spec.slot === "iphone-69")).toHaveLength(3);
  });
});

describe("duoChassisAspect", () => {
  it("turns the open device a quarter turn for portrait screenshots", () => {
    expect(duoChassisAspect("inner", "portrait")).toBe("117.8/164.6");
    expect(duoChassisAspect("inner", "landscape")).toBe("164.6/117.8");
  });

  it("rotates only the closed outer with landscape screenshots", () => {
    expect(duoChassisAspect("outer", "portrait")).toBe("84.1/117.8");
    expect(duoChassisAspect("outer", "landscape")).toBe("117.8/84.1");
  });
});

describe("connectPreviewStyle", () => {
  it("exposes Connect pixel boxes for portrait crop frames", () => {
    expect(connectPreviewStyle(duoSpec("duo-outer", "portrait"), duoSpec("duo-inner", "portrait"))).toEqual({
      "--preview-outer-w": "1398",
      "--preview-outer-h": "2034",
      "--preview-inner-w": "2007",
      "--preview-inner-h": "2853",
    });
  });

  it("exposes Connect pixel boxes for landscape crop frames", () => {
    expect(connectPreviewStyle(duoSpec("duo-outer", "landscape"), duoSpec("duo-inner", "landscape"))).toEqual({
      "--preview-outer-w": "2034",
      "--preview-outer-h": "1398",
      "--preview-inner-w": "2853",
      "--preview-inner-h": "2007",
    });
  });
});

describe("formatInches", () => {
  it("uses the locale's decimal mark and inch sign", () => {
    expect(formatInches('5.4"', "fr")).toBe("5,4\u2033");
    expect(formatInches('5.4"', "en")).toBe('5.4"');
    expect(formatInches(7.6, "fr")).toBe("7,6\u2033");
  });
});

describe("specRowDetail", () => {
  it("tells the three iPhone 6.9″ rows apart in both orientations", () => {
    const rows = SIZE_SPECS.filter((spec) => spec.slot === "iphone-69" && spec.orientation === "portrait");
    const details = rows.map((spec) => specRowDetail(spec, "fr"));
    expect(new Set(details).size).toBe(rows.length);
    expect(details[0]).toBe("6,9\u2033 · format 1320 px");
    const landscape = SIZE_SPECS.find((spec) => spec.id === "69b-l")!;
    expect(specRowDetail(landscape, "en")).toBe('6.9" · 1290 px format');
  });

  it("keeps Duo rows to the display size", () => {
    expect(specRowDetail(duoSpec("duo-outer", "portrait"), "fr")).toBe("5,4\u2033");
  });
});
