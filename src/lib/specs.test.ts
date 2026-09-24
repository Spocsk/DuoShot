import { describe, expect, it } from "vitest";
import { connectPreviewStyle, duoChassisAspect, duoSpec } from "./specs";

describe("duoChassisAspect", () => {
  it("keeps the inner as the open landscape book in both screenshot orientations", () => {
    expect(duoChassisAspect("inner", "portrait")).toBe("164.6/117.8");
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
