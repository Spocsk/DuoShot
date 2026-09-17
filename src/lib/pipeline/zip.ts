import JSZip from "jszip";
import type { DeviceSlot, Orientation, RenderOptions, SizeSpec } from "../specs";
import { specPixels, zipFolderName } from "../specs";
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
  if (options.spec.slot === "iphone-69") {
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
  include69: boolean;
  locale?: "fr" | "en";
  cloneScores?: CloneResult[];
  unpaired?: boolean;
  flattenAlpha?: boolean;
  folders?: string[];
  pixels?: string[];
  compositionWarnings?: string[];
}): string {
  const slots: DeviceSlot[] = ["duo-outer", "duo-inner"];
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
    options.pixels?.length ? `- Pixels: ${options.pixels.join(", ")}` : "- Pixels: App Store Connect shelf sizes",
    `- Alpha: flattened${options.flattenAlpha ? " (source had transparency)" : ""}`,
    "- Color: sRGB RGB, no alpha",
    options.unpaired ? "- Slides: outer/inner counts differ" : "- Slides: paired by index",
    "",
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    "PNG-24 (default) or JPEG q90. RGB, no alpha, exact App Store pixels.",
    "Sources and ZIP are retained at most 24 hours.",
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
    lines.push("", "Généré avec DuoShot — On ne vend pas un resize. On vend un build qui passe.");
  }
  return `${lines.join("\n")}\n`;
}

export async function buildZip(options: {
  appName: string;
  clientSlug?: string | null;
  orientation: Orientation;
  branded: boolean;
  include69: boolean;
  format: RenderOptions["format"];
  images: ZipImage[];
  cloneScores?: CloneResult[];
  unpaired?: boolean;
  flattenAlpha?: boolean;
  compositionWarnings?: string[];
}): Promise<Buffer> {
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
      orientation: orientations.join(" + "),
      branded: options.branded,
      include69: options.include69,
      cloneScores: options.cloneScores,
      unpaired: options.unpaired,
      flattenAlpha: options.flattenAlpha,
      folders,
      pixels,
      compositionWarnings: options.compositionWarnings,
    }),
  );
  for (const image of options.images) {
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
