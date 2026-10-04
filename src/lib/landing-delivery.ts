import { HARBOR_SLIDES } from "./pipeline/harbor";
import { zipEntryPath } from "./pipeline/zip";
import { duoSpec, type Locale, type SizeSpec } from "./specs";

/** The landing's Harbor example uses the same app name as /api/example-zip. */
export const EXAMPLE_APP_NAME = "ExampleApp";

/**
 * Byte sizes measured from /api/example-zip (Harbor demo, PNG, portrait) on 2026-10-04.
 * Shown as an order of magnitude; a real export depends on your own captures.
 */
const MEASURED_BYTES: Record<string, number> = {
  "exampleapp/duo-outer-portrait/01.png": 402_653,
  "exampleapp/duo-inner-portrait/01.png": 319_577,
  "exampleapp/duo-outer-portrait/02.png": 402_651,
  "exampleapp/duo-inner-portrait/02.png": 315_210,
  "exampleapp/duo-outer-portrait/03.png": 404_194,
  "exampleapp/duo-inner-portrait/03.png": 319_643,
};

export type DeliveredFile = {
  path: string;
  name: string;
  folder: string;
  side: "outer" | "inner";
  spec: SizeSpec;
  bytes: number | null;
};

/** File list of the Harbor example ZIP, named by the export's own zipEntryPath. */
export function exampleDeliveredFiles(): DeliveredFile[] {
  const outer = duoSpec("duo-outer", "portrait");
  const inner = duoSpec("duo-inner", "portrait");
  return HARBOR_SLIDES.flatMap((_, index) =>
    ([["outer", outer], ["inner", inner]] as const).map(([side, spec]) => {
      const path = zipEntryPath({ appName: EXAMPLE_APP_NAME, spec, index, format: "png" });
      const parts = path.split("/");
      return {
        path,
        name: parts.at(-1)!,
        folder: parts.slice(0, -1).join("/"),
        side,
        spec,
        bytes: MEASURED_BYTES[path] ?? null,
      };
    }),
  );
}

export function formatBytes(bytes: number, locale: Locale): string {
  const kilo = Math.round(bytes / 1000);
  return locale === "fr" ? `${kilo} Ko` : `${kilo} KB`;
}
