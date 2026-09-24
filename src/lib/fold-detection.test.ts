import { describe, expect, it } from "vitest";
import { foldSafetyBand, foldScanRegion, wordsOnFold } from "./fold-detection";

const header = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
const word = (left: number, top: number, width: number, height: number, confidence = 90) =>
  `5\t1\t1\t1\t1\t1\t${left}\t${top}\t${width}\t${height}\t${confidence}\tHarbor`;

describe("fold text detection", () => {
  it("finds words crossing the portrait fold", () => {
    expect(wordsOnFold([header, word(45, 20, 10, 8)].join("\n"), 100, 100, "portrait")).toBe(1);
    expect(wordsOnFold([header, word(10, 20, 10, 8)].join("\n"), 100, 100, "portrait")).toBe(0);
  });

  it("finds words crossing the landscape fold and ignores low confidence", () => {
    expect(wordsOnFold([header, word(20, 45, 15, 10)].join("\n"), 100, 100, "landscape")).toBe(1);
    expect(wordsOnFold([header, word(20, 45, 15, 10, 10)].join("\n"), 100, 100, "landscape")).toBe(0);
  });

  it("warns for small words touching the safety margin in either orientation", () => {
    expect(wordsOnFold([header, word(43, 20, 3, 5, 25)].join("\n"), 100, 100, "portrait")).toBe(1);
    expect(wordsOnFold([header, word(20, 43, 5, 3, 25)].join("\n"), 100, 100, "landscape")).toBe(1);
    expect(wordsOnFold([header, word(25, 20, 5, 5, 90)].join("\n"), 100, 100, "portrait")).toBe(0);
  });

  it("maps a central OCR crop back to the same fold band", () => {
    expect(foldScanRegion(200, 300, "portrait")).toEqual({ left: 50, top: 0, width: 100, height: 300 });
    const band = foldSafetyBand(200, 300, "portrait");
    expect(wordsOnFold([header, word(45, 20, 4, 8)].join("\n"), 100, 300, "portrait", {
      left: band.left - 50, top: band.top, width: band.width, height: band.height,
    })).toBe(1);
  });
});
