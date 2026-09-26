export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_BYTES = 200 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 40_000_000;
export const MAX_ZIP_BYTES = 100 * 1024 * 1024;

export function assertBatchSize(files: readonly { size: number }[]) {
  if (files.some(({ size }) => !Number.isFinite(size) || size < 1 || size > MAX_SOURCE_BYTES)) {
    throw new Error("INPUT_TOO_LARGE");
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) {
    throw new Error("BATCH_TOO_LARGE");
  }
}
