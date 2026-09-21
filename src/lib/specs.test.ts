import { describe, expect, it } from "vitest";
import { connectPreviewStyle, duoSpec } from "./specs";

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
