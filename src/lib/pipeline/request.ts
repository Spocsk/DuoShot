import { MAX_IMAGES, type CropTransforms, type Locale, type RenderOptions } from "../specs";

export type RenderBody = {
  paths?: string[];
  outerPaths?: string[];
  innerPaths?: string[];
  appName?: string;
  clientName?: string;
  sameSet?: boolean;
  include69?: boolean;
  assumeCloneRisk?: boolean;
  orientation?: "portrait" | "landscape";
  locale?: Locale;
  options?: Partial<RenderOptions>;
  transforms?: Partial<CropTransforms>;
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Validate before reserving quota, reading storage, or interpolating SVG colors. */
export function parseRenderBody(value: unknown, userId: string): RenderBody {
  if (!record(value)) throw new Error("INVALID_REQUEST");
  for (const key of ["paths", "outerPaths", "innerPaths"] as const) {
    const paths = value[key];
    if (paths === undefined) continue;
    if (!Array.isArray(paths) || paths.length > MAX_IMAGES || paths.some((path) => typeof path !== "string")) {
      throw new Error("INVALID_PAIRS");
    }
    if (paths.some((path: string) => !path.startsWith(`${userId}/`) || path.length > 512 || /[\\?#%\x00-\x1f]/.test(path) || path.split("/").some((part) => !part || part === "." || part === ".."))) {
      throw new Error("PATH_FORBIDDEN");
    }
  }
  for (const key of ["sameSet", "include69", "assumeCloneRisk"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "boolean") throw new Error("INVALID_REQUEST");
  }
  for (const key of ["appName", "clientName"] as const) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || value[key].length > 200)) throw new Error("INVALID_REQUEST");
  }
  if (value.orientation !== undefined && !["portrait", "landscape"].includes(value.orientation as string)) throw new Error("INVALID_OPTIONS");
  if (value.locale !== undefined && !["fr", "en"].includes(value.locale as string)) throw new Error("INVALID_OPTIONS");
  if (value.options !== undefined) {
    if (!record(value.options)) throw new Error("INVALID_OPTIONS");
    const options = value.options;
    const enums: Record<string, string[]> = {
      orientation: ["portrait", "landscape"], fit: ["contain", "cover", "smart"],
      background: ["solid", "gradient", "blur"], format: ["png", "jpeg"],
      titleFont: ["sans", "serif"], titlePosition: ["top", "bottom"],
    };
    for (const [key, choices] of Object.entries(enums)) {
      if (options[key] !== undefined && !choices.includes(options[key] as string)) throw new Error("INVALID_OPTIONS");
    }
    for (const key of ["solidColor", "gradientFrom", "gradientTo"]) {
      if (options[key] !== undefined && (typeof options[key] !== "string" || !/^#[a-f\d]{6}$/i.test(options[key]))) throw new Error("INVALID_OPTIONS");
    }
    for (const key of ["title", "subtitle"]) {
      if (options[key] !== undefined && (typeof options[key] !== "string" || options[key].length > 500)) throw new Error("INVALID_OPTIONS");
    }
    if (options.burnHinge !== undefined && typeof options.burnHinge !== "boolean") throw new Error("INVALID_OPTIONS");
  }
  if (value.transforms !== undefined) {
    if (!record(value.transforms)) throw new Error("INVALID_TRANSFORMS");
    for (const key of ["outer", "inner"]) {
      const items = value.transforms[key];
      if (items === undefined) continue;
      if (!Array.isArray(items) || items.length > MAX_IMAGES) throw new Error("INVALID_TRANSFORMS");
      for (const item of items) {
        if (!record(item) || (item.fit !== undefined && !["contain", "cover", "smart"].includes(item.fit as string))) throw new Error("INVALID_TRANSFORMS");
        for (const field of ["x", "y", "zoom"]) {
          if (item[field] !== undefined && (typeof item[field] !== "number" || !Number.isFinite(item[field]))) throw new Error("INVALID_TRANSFORMS");
        }
      }
    }
  }
  return value as RenderBody;
}

export function renderErrorStatus(code: string) {
  if (code === "RENDER_BUSY") return 503;
  if (code === "REQUEST_CANCELLED") return 499;
  if (["PATH_FORBIDDEN", "CLONE_RISK"].includes(code)) return 403;
  if (["INPUT_TOO_LARGE", "BATCH_TOO_LARGE", "EXPORT_TOO_LARGE", "RENDER_GEOMETRY_TOO_LARGE"].includes(code)) return 413;
  if (code.endsWith("_UNAVAILABLE")) return 503;
  if (code.endsWith("_FAILED")) return 500;
  return 400;
}
