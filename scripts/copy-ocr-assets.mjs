// Copies the Tesseract worker, LSTM cores and language data into public/ocr so the
// fold check never loads code or models from a third-party CDN.
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const packageDir = (name) => dirname(require.resolve(`${name}/package.json`));
const target = join(process.cwd(), "public", "ocr");

rmSync(target, { recursive: true, force: true });
mkdirSync(join(target, "lang"), { recursive: true });

copyFileSync(join(packageDir("tesseract.js"), "dist", "worker.min.js"), join(target, "worker.min.js"));
// The worker picks one of these at runtime from the browser's SIMD support (OEM LSTM only).
for (const core of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
  copyFileSync(join(packageDir("tesseract.js-core"), core), join(target, core));
}
for (const lang of ["eng", "fra"]) {
  copyFileSync(join(packageDir(`@tesseract.js-data/${lang}`), "4.0.0_best_int", `${lang}.traineddata.gz`), join(target, "lang", `${lang}.traineddata.gz`));
}
