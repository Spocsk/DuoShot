import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { inspectScreenshot } from "./screenshot-checker-browser";

const decode = vi.fn();
const drawImage = vi.fn();
const getImageData = vi.fn();
const revokeObjectURL = vi.fn();
const canvas = { width: 0, height: 0, getContext: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  decode.mockResolvedValue(undefined);
  canvas.getContext.mockReturnValue({ drawImage, getImageData });
  getImageData.mockReturnValue({ data: new Uint8ClampedArray([0, 0, 0, 255]) });
  vi.stubGlobal("Image", class {
    naturalWidth = 1398;
    naturalHeight = 2034;
    src = "";
    decode = decode;
  });
  vi.stubGlobal("document", { createElement: () => canvas });
  vi.stubGlobal("URL", { createObjectURL: () => "blob:local-test", revokeObjectURL });
});
afterEach(() => vi.unstubAllGlobals());

it("reads dimensions and every pixel strip locally, including the last transparent pixel", async () => {
  getImageData.mockImplementation((_x, y) => ({ data: new Uint8ClampedArray([0, 0, 0, y === 1920 ? 254 : 255]) }));
  const file = new File([new Uint8Array([255, 216, 255])], "screenshot.jpg", { type: "image/jpeg" });
  const result = await inspectScreenshot(file);
  expect(result).toMatchObject({ width: 1398, height: 2034, transparent: true, alphaChannel: false, supportedFormat: true, match: { slot: "duo-outer" } });
  expect(drawImage).toHaveBeenCalledWith(expect.objectContaining({ src: "blob:local-test" }), 0, 0);
  expect(getImageData).toHaveBeenCalledTimes(16);
  expect(getImageData).toHaveBeenLastCalledWith(0, 1920, 1398, 114);
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-test");
  expect(canvas.width).toBe(0);
  expect(canvas.height).toBe(0);
});

it("flags opaque PNG alpha metadata regardless of file name or reported MIME", async () => {
  const png = new Uint8Array(33);
  png.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  png[25] = 6;
  const result = await inspectScreenshot(new File([png], "screenshot.jpg", { type: "image/jpeg" }));
  expect(result).toMatchObject({ transparent: false, alphaChannel: true, supportedFormat: true });
});

it("does not mistake another decoded image format for PNG or JPEG", async () => {
  const result = await inspectScreenshot(new File(["GIF89a"], "screenshot.png", { type: "image/png" }));
  expect(result.supportedFormat).toBe(false);
});

it.each(["decode", "canvas", "pixels"])("releases local resources when %s fails", async (failure) => {
  if (failure === "decode") decode.mockRejectedValue(new Error("Unreadable image"));
  if (failure === "canvas") canvas.getContext.mockReturnValue(null);
  if (failure === "pixels") getImageData.mockImplementation(() => { throw new Error("Cannot read pixels"); });
  await expect(inspectScreenshot(new File(["bad"], "broken.png"))).rejects.toThrow();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:local-test");
  expect(canvas.width).toBe(0);
  expect(canvas.height).toBe(0);
});
