import { describe, expect, it } from "vitest";
import { foldSafetyBand, foldScanRegion, wordsOnFold } from "./fold-detection";
import { hingeBand } from "./specs";

const header = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
const word = (left: number, top: number, width: number, height: number, confidence = 90) =>
  `5\t1\t1\t1\t1\t1\t${left}\t${top}\t${width}\t${height}\t${confidence}\tHarbor`;

// Apple: unfolded 164.6 x 117.8 mm, folded 84.1 x 117.8 mm. The fold halves the long side,
// so the portrait App Store slot (2007x2853) folds across its middle height.
describe("fold geometry", () => {
  it("places the portrait fold as a horizontal band across the middle height", () => {
    const band = hingeBand({ width: 2007, height: 2853, orientation: "portrait" });
    expect(band.x).toBe(0);
    expect(band.width).toBe(2007);
    expect(band.height).toBeLessThan(band.width);
    expect(band.y + band.height / 2).toBeCloseTo(2853 / 2, 0);
  });

  it("places the landscape fold as a vertical band across the middle width", () => {
    const band = hingeBand({ width: 2853, height: 2007, orientation: "landscape" });
    expect(band.y).toBe(0);
    expect(band.height).toBe(2007);
    expect(band.width).toBeLessThan(band.height);
    expect(band.x + band.width / 2).toBeCloseTo(2853 / 2, 0);
  });
});

describe("fold text detection", () => {
  it("warns for a word in the middle horizontal band of a portrait inner image", () => {
    expect(wordsOnFold([header, word(400, 1400, 600, 60)].join("\n"), 2007, 2853, "portrait")).toBe(1);
    expect(wordsOnFold([header, word(20, 45, 15, 10)].join("\n"), 100, 100, "portrait")).toBe(1);
  });

  it("does not warn for a word in the middle vertical column of a portrait inner image", () => {
    expect(wordsOnFold([header, word(45, 10, 10, 8)].join("\n"), 100, 100, "portrait")).toBe(0);
    expect(wordsOnFold([header, word(45, 80, 10, 8)].join("\n"), 100, 100, "portrait")).toBe(0);
  });

  it("finds words crossing the landscape fold and ignores low confidence", () => {
    expect(wordsOnFold([header, word(45, 20, 10, 8)].join("\n"), 100, 100, "landscape")).toBe(1);
    expect(wordsOnFold([header, word(45, 20, 10, 8, 10)].join("\n"), 100, 100, "landscape")).toBe(0);
    expect(wordsOnFold([header, word(20, 45, 15, 10)].join("\n"), 100, 100, "landscape")).toBe(0);
  });

  it("warns for small words touching the safety margin in either orientation", () => {
    expect(wordsOnFold([header, word(20, 43, 5, 3, 25)].join("\n"), 100, 100, "portrait")).toBe(1);
    expect(wordsOnFold([header, word(43, 20, 3, 5, 25)].join("\n"), 100, 100, "landscape")).toBe(1);
    expect(wordsOnFold([header, word(20, 25, 5, 5, 90)].join("\n"), 100, 100, "portrait")).toBe(0);
  });

  it("maps a central OCR crop back to the same fold band", () => {
    expect(foldScanRegion(200, 300, "portrait")).toEqual({ left: 0, top: 75, width: 200, height: 150 });
    expect(foldScanRegion(300, 200, "landscape")).toEqual({ left: 75, top: 0, width: 150, height: 200 });
    const band = foldSafetyBand(200, 300, "portrait");
    expect(wordsOnFold([header, word(20, 70, 30, 6)].join("\n"), 200, 150, "portrait", {
      left: band.left, top: band.top - 75, width: band.width, height: band.height,
    })).toBe(1);
    expect(wordsOnFold([header, word(95, 5, 10, 6)].join("\n"), 200, 150, "portrait", {
      left: band.left, top: band.top - 75, width: band.width, height: band.height,
    })).toBe(0);
  });
});
