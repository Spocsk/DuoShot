import { DUO_SLOT_MAX } from "../duo-selection";
import { MAX_ZIP_BYTES } from "./limits";
import JSZip from "jszip";
import type { DeviceSlot, Orientation, RenderOptions, SizeSpec } from "../specs";
import { isDuoSlot, specPixels, zipFolderName } from "../specs";
import { slugify } from "./geometry";
import type { CloneResult } from "./clone-score";

export type ZipImage = {
  spec: SizeSpec;
  index: number;
  buffer: Buffer;
};

export function zipEntryPath(options: {
  appName: string;
  clientSlug?: string | null;
  spec: SizeSpec;
  index: number;
  format: RenderOptions["format"];
}): string {
  const app = slugify(options.appName);
  const prefix = options.clientSlug ? `${slugify(options.clientSlug)}/` : "";
  const folder = zipFolderName(options.spec.slot, options.spec.orientation);
  const ext = options.format === "jpeg" ? "jpg" : "png";
  const seq = String(options.index + 1).padStart(2, "0");
  if (!isDuoSlot(options.spec.slot)) {
    return `${prefix}${app}/${folder}/${options.spec.width}x${options.spec.height}/${seq}.${ext}`;
  }
  return `${prefix}${app}/${folder}/${seq}.${ext}`;
}

function cloneLine(result: CloneResult): string {
  const seq = String(result.index + 1).padStart(2, "0");
  const label =
    result.label === "risk" ? "RISK 2.3.3" : result.label === "review" ? "CHECK 2.3.3" : "OK 2.3.3";
  return `${seq}: ${label}`;
}

export function buildReadme(options: {
  appName: string;
  orientation: string;
  branded: boolean;
  include63?: boolean;
  include69: boolean;
  locale?: "fr" | "en";
  rawDuoSets?: boolean;
  cloneScores?: CloneResult[];
  unpaired?: boolean;
  flattenAlpha?: boolean;
  folders?: string[];
  pixels?: string[];
  compositionWarnings?: string[];
}): string {
  const slots: DeviceSlot[] = options.rawDuoSets ? ["duo-outer", "duo-inner"] : ["duo-outer"];
  if (options.include63) slots.push("iphone-63");
  if (options.include69) slots.push("iphone-69");
  const fallbackOrientation: Orientation =
    options.orientation === "landscape" ? "landscape" : "portrait";
  const folders =
    options.folders?.length
      ? options.folders
      : slots.map((slot) => zipFolderName(slot, fallbackOrientation));
  const lines = [
    `DuoShot export — ${options.appName}`,
    `Orientation: ${options.orientation}`,
    `Folders: ${folders.join(", ")}`,
    "",
  ];
  if (options.pixels?.length) {
    lines.push("Pixels:");
    for (const line of options.pixels) lines.push(`- ${line}`);
    lines.push("");
  }
  lines.push(
    "Checks:",
    options.pixels?.length ? `- Output dimensions: ${options.pixels.join(", ")}` : "- Output dimensions: selected formats",
    `- Alpha: flattened${options.flattenAlpha ? " (source had transparency)" : ""}`,
    "- Color: sRGB RGB, no alpha",
    options.rawDuoSets ? (options.unpaired ? "- Slides: outer/inner counts differ" : "- Slides: paired by index") : "- Source indices: original indices retained; mixed selections do not require paired counts",
    "",
    "PNG (default) or JPEG q90. RGB, no alpha. Review these files before manual upload.",
    options.rawDuoSets
      ? "Raw outer + inner sets: pick up to 10 Duo screenshots in your selection. These are example assets."
      : "Selected Duo slot content only; folder names identify screen dimensions, not separate App Store Connect slots. duo-slot.json lists upload order (selection order for a mix).",
    "App Store Connect has an iPhone Duo slot, with up to 10 screenshots per device size.",
    "Both sizes are accepted: outer 1398x2034 and inner 2007x2853, or their landscape dimensions. Not yet tested by DuoShot.",
    "App Store Connect propose un emplacement iPhone Duo, avec jusqu’à 10 captures par taille d’appareil. DuoShot limite la sélection à 10 captures Duo maximum, externe et interne confondus. Les deux tailles sont acceptées ; dépôt pas encore testé par DuoShot.",
    "Exports exceeding 10 selected Duo screenshots are rejected with DUO_SLOT_LIMIT (HTTP 400); nothing is silently trimmed.",
    "Source: https://github.com/rorkai/App-Store-Connect-CLI/blob/main/docs/design/iphone-duo-screenshots.md",
    "Apple status checked 2026-10-13: App Store Connect accepts iPhone Duo optimized apps since 2026-10-05; Duo screenshots are required for every submission from April 2027 for apps built with the iOS 27.1 SDK or later.",
    "Source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/",
    "Visual checks are advisory; this report does not predict App Store approval.",
    "Sources and ZIP expire after 24 hours. Server cleanup runs every 15 minutes; failed cleanup is retried. Local drafts stay on your device.",
  );
  if (options.cloneScores?.length) {
    lines.push("", "Guideline 2.3.3 clone score (outer[i] vs inner[i]):");
    for (const result of options.cloneScores) {
      lines.push(`- ${cloneLine(result)}`);
    }
  }
  if (options.compositionWarnings?.length) {
    lines.push("", "Composition warnings:");
    for (const warning of options.compositionWarnings) lines.push(`- ${warning}`);
  }
  if (options.branded) {
    lines.push("", "Préparé avec DuoShot — vérifiez chaque image avant le dépôt dans App Store Connect.");
  }
  return `${lines.join("\n")}\n`;
}

export async function buildZip(options: {
  appName: string;
  clientSlug?: string | null;
  orientation: Orientation;
  branded: boolean;
  include63?: boolean;
  include69: boolean;
  format: RenderOptions["format"];
  images: ZipImage[];
  rawDuoSets?: boolean;
  cloneScores?: CloneResult[];
  unpaired?: boolean;
  flattenAlpha?: boolean;
  compositionWarnings?: string[];
}): Promise<Buffer> {
  const duo = options.images.filter((image) => isDuoSlot(image.spec.slot));
  if (!options.rawDuoSets && duo.length > DUO_SLOT_MAX) throw new Error("DUO_SLOT_LIMIT");
  const zip = new JSZip();
  const app = slugify(options.appName);
  const prefix = options.clientSlug ? `${slugify(options.clientSlug)}/` : "";
  const folders = [
    ...new Set(options.images.map((image) => zipFolderName(image.spec.slot, image.spec.orientation))),
  ];
  const pixels = [
    ...new Set(
      options.images.map(
        (image) =>
          `${zipFolderName(image.spec.slot, image.spec.orientation)}: ${specPixels(image.spec)}`,
      ),
    ),
  ];
  const orientations = [...new Set(options.images.map((image) => image.spec.orientation))];
  zip.file(
    `${prefix}${app}/README.txt`,
    buildReadme({
      appName: options.appName,
      rawDuoSets: options.rawDuoSets,
      orientation: orientations.join(" + "),
      branded: options.branded,
      include63: options.include63,
      include69: options.include69,
      cloneScores: options.cloneScores,
      unpaired: options.unpaired,
      flattenAlpha: options.flattenAlpha,
      folders,
      pixels,
      compositionWarnings: options.compositionWarnings,
    }),
  );
  if (!options.rawDuoSets) zip.file(`${prefix}${app}/duo-slot.json`, JSON.stringify({
    displayType: "APP_IPHONE_DUO", maxPerLocale: DUO_SLOT_MAX,
    files: duo.map((image) => zipEntryPath({ ...options, spec: image.spec, index: image.index })),
  }, null, 2));
  let imageBytes = 0;
  for (const image of options.images) {
    imageBytes += image.buffer.length;
    if (imageBytes > MAX_ZIP_BYTES) throw new Error("EXPORT_TOO_LARGE");
    zip.file(
      zipEntryPath({
        appName: options.appName,
        clientSlug: options.clientSlug,
        spec: image.spec,
        index: image.index,
        format: options.format,
      }),
      image.buffer,
    );
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}
