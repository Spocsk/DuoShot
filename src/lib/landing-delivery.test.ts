import { describe, expect, it } from "vitest";
import { EXAMPLE_ZIP_TREE } from "./pipeline/harbor";
import { exampleDeliveredFiles, formatBytes } from "./landing-delivery";

describe("landing delivered files", () => {
  it("names files with the export's own ZIP paths", () => {
    const paths = exampleDeliveredFiles().map((file) => file.path);
    for (const entry of EXAMPLE_ZIP_TREE.filter((entry) => entry.endsWith(".png"))) {
      expect(paths).toContain(entry);
    }
    expect(paths).toHaveLength(6);
  });

  it("carries the Connect dimensions and a measured weight for every file", () => {
    for (const file of exampleDeliveredFiles()) {
      expect(file.bytes).toBeGreaterThan(0);
      expect(`${file.spec.width}x${file.spec.height}`).toBe(file.side === "outer" ? "1398x2034" : "2007x2853");
    }
  });

  it("formats weights per locale", () => {
    expect(formatBytes(402_653, "fr")).toBe("403 Ko");
    expect(formatBytes(402_653, "en")).toBe("403 KB");
  });
});
