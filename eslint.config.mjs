import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Bundled render worker (scripts/build-render-worker.mjs).
    "dist/**",
    "next-env.d.ts",
    "cypress/**",
    "cypress.config.ts",
    // Vendored Tesseract assets copied by scripts/copy-ocr-assets.mjs.
    "public/ocr/**",
  ]),
]);

export default eslintConfig;
