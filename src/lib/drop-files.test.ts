import { describe, expect, it } from "vitest";
import { fileSortKey, isAllowedImage, partitionDroppedFiles, sortDroppedFiles } from "./drop-files";

describe("drop-files", () => {
  it("keeps PNG and JPEG, rejects other types", () => {
    const png = new File(["x"], "01.png", { type: "image/png" });
    const jpg = new File(["x"], "shot.jpg", { type: "image/jpeg" });
    const txt = new File(["no"], "notes.txt", { type: "text/plain" });
    const { images, rejected } = partitionDroppedFiles([txt, jpg, png]);
    expect(images.map((file) => file.name)).toEqual(["01.png", "shot.jpg"]);
    expect(rejected.map((file) => file.name)).toEqual(["notes.txt"]);
  });

  it("orders folder drops by relative path so 01 comes before 02", () => {
    const second = new File(["b"], "02.png", { type: "image/png" });
    const first = new File(["a"], "01.png", { type: "image/png" });
    Object.defineProperty(second, "webkitRelativePath", { value: "set/02.png" });
    Object.defineProperty(first, "webkitRelativePath", { value: "set/01.png" });
    expect(fileSortKey(first) < fileSortKey(second)).toBe(true);
    expect(sortDroppedFiles([second, first]).map((file) => file.name)).toEqual(["01.png", "02.png"]);
    expect(isAllowedImage(first)).toBe(true);
  });
});
