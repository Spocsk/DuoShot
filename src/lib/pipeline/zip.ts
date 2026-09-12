import JSZip from "jszip";
import type { DeviceSlot, Orientation, RenderOptions, SizeSpec } from "../specs";
import { zipFolderName } from "../specs";
import { slugify } from "./geometry";

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

export function buildReadme(options: {
  appName: string;
  orientation: Orientation;
  branded: boolean;
  include69: boolean;
  locale?: "fr" | "en";
}): string {
  const slots: DeviceSlot[] = ["duo-outer", "duo-inner"];
  if (options.include69) slots.push("iphone-69");
  const lines = [
    `DuoShot export — ${options.appName}`,
    `Orientation: ${options.orientation}`,
    `Folders: ${slots.map((slot) => zipFolderName(slot, options.orientation)).join(", ")}`,
    "",
    "PNG-24 (default) or JPEG q90. RGB, no alpha, exact App Store pixels.",
    "Sources and ZIP are retained at most 24 hours.",
  ];
  if (options.branded) {
    lines.push("", "Généré avec DuoShot — Tes screenshots Duo, justes, en 3 minutes. Sans device.");
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
}): Promise<Buffer> {
  const zip = new JSZip();
  const app = slugify(options.appName);
  const prefix = options.clientSlug ? `${slugify(options.clientSlug)}/` : "";
  zip.file(
    `${prefix}${app}/README.txt`,
    buildReadme({
      appName: options.appName,
      orientation: options.orientation,
      branded: options.branded,
      include69: options.include69,
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
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
