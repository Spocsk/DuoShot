export const SPECS_VERSION_DATE = "2026-09-25";
export const POLICY_VERSION = "2026-09-26";
export const MAX_IMAGES = 10;
export const WARN_MIN_IMAGES = 3;
export const JPEG_QUALITY = 90;
export const SIGNED_URL_SECONDS = 60 * 60;
export const STORAGE_RETENTION_HOURS = 24;

export type Locale = "fr" | "en";
export type Orientation = "portrait" | "landscape";
export type FitMode = "contain" | "cover" | "smart";
export type SlideFitMode = "contain" | "cover";
export type BackgroundMode = "solid" | "gradient" | "blur";
export type TitlePosition = "top" | "bottom";
export type TitleFont = "sans" | "serif";
export type OutputFormat = "png" | "jpeg";
export type DeviceSlot = "duo-outer" | "duo-inner" | "iphone-69";
export type PlanId = "free" | "indie" | "studio";

export type CropTransform = {
  fit: FitMode;
  /** Horizontal focal point, normalized from 0 (left) to 1 (right). */
  x: number;
  /** Vertical focal point, normalized from 0 (top) to 1 (bottom). */
  y: number;
  /** Additional scale in cover mode. Missing values in saved sets mean 1. */
  zoom?: number;
};

export type CropTransforms = {
  outer: CropTransform[];
  inner: CropTransform[];
};

export const DEFAULT_CROP_TRANSFORM: CropTransform = {
  fit: "cover",
  x: 0.5,
  y: 0.5,
  zoom: 1,
};

export function normalizeCropTransform(
  transform: Partial<CropTransform> | null | undefined,
  fallbackFit: FitMode = "cover",
): CropTransform {
  const clamp = (value: number | undefined) => Math.min(1, Math.max(0, Number.isFinite(value) ? value! : 0.5));
  return {
    fit: transform?.fit === "contain" || transform?.fit === "cover" || transform?.fit === "smart"
      ? transform.fit
      : fallbackFit,
    x: clamp(transform?.x),
    y: clamp(transform?.y),
    zoom: Math.min(2, Math.max(1, Number.isFinite(transform?.zoom) ? transform!.zoom! : 1)),
  };
}

export type SizeSpec = {
  id: string;
  slot: DeviceSlot;
  label: string;
  inches: string;
  width: number;
  height: number;
  orientation: Orientation;
  gated?: "indie-studio";
};

function pair(
  id: string,
  slot: DeviceSlot,
  label: string,
  inches: string,
  w: number,
  h: number,
  gated?: "indie-studio",
): SizeSpec[] {
  return [
    {
      id: `${id}-p`,
      slot,
      label,
      inches,
      width: w,
      height: h,
      orientation: "portrait",
      gated,
    },
    {
      id: `${id}-l`,
      slot,
      label,
      inches,
      width: h,
      height: w,
      orientation: "landscape",
      gated,
    },
  ];
}

export const SIZE_SPECS: SizeSpec[] = [
  ...pair("outer", "duo-outer", "Duo outer", '5.4"', 1398, 2034),
  ...pair("inner", "duo-inner", "Duo inner", '7.6"', 2007, 2853),
  ...pair("69a", "iphone-69", 'iPhone 6.9"', '6.9"', 1320, 2868, "indie-studio"),
  ...pair("69b", "iphone-69", 'iPhone 6.9"', '6.9"', 1290, 2796, "indie-studio"),
  ...pair("69c", "iphone-69", 'iPhone 6.9"', '6.9"', 1260, 2736, "indie-studio"),
];

export function appStoreDisclaimer233(locale: Locale): string {
  return locale === "fr"
    ? "Apple App Store Review Guideline 2.3.3 : les captures doivent représenter l’app avec précision. DuoShot redimensionne et compose tes visuels ; il ne fabrique pas de fausses fonctionnalités. Vérifie chaque set avant soumission."
    : "Apple App Store Review Guideline 2.3.3 requires screenshots to represent the app accurately. DuoShot resizes and composes your visuals; it does not invent features. Check every set before submitting.";
}

export function canUse69(plan: PlanId): boolean {
  return plan === "indie" || plan === "studio";
}

export function zipFolderName(slot: DeviceSlot, orientation: Orientation): string {
  return `${slot}-${orientation}`;
}

export function duoSpec(slot: "duo-outer" | "duo-inner", orientation: Orientation): SizeSpec {
  const spec = SIZE_SPECS.find((item) => item.slot === slot && item.orientation === orientation);
  if (!spec) throw new Error("SPEC_MISSING");
  return spec;
}

/** Physical iPhone Duo chassis in millimetres. Open book keeps the closed height. */
export const DUO_OUTER_MM = { width: 84.1, height: 117.8 } as const;
export const DUO_INNER_MM = { width: 164.6, height: 117.8 } as const;

export function duoChassisAspect(slot: "outer" | "inner", orientation: Orientation): string {
  if (slot === "inner") {
    return `${DUO_INNER_MM.width}/${DUO_INNER_MM.height}`;
  }
  if (orientation === "landscape") {
    return `${DUO_OUTER_MM.height}/${DUO_OUTER_MM.width}`;
  }
  return `${DUO_OUTER_MM.width}/${DUO_OUTER_MM.height}`;
}

/** CSS custom properties so the crop/review pixel frame matches Connect, not the mm chassis. */
export function connectPreviewStyle(
  outer: Pick<SizeSpec, "width" | "height">,
  inner: Pick<SizeSpec, "width" | "height">,
): {
  "--preview-outer-w": string;
  "--preview-outer-h": string;
  "--preview-inner-w": string;
  "--preview-inner-h": string;
} {
  return {
    "--preview-outer-w": String(outer.width),
    "--preview-outer-h": String(outer.height),
    "--preview-inner-w": String(inner.width),
    "--preview-inner-h": String(inner.height),
  };
}

export function specPixels(spec: Pick<SizeSpec, "width" | "height">): string {
  return `${spec.width}x${spec.height}`;
}

export function targetsFor(options: {
  orientation: Orientation;
  include69: boolean;
  plan: PlanId;
}): SizeSpec[] {
  if (options.include69 && !canUse69(options.plan)) {
    throw new Error("IPHONE_69_GATED");
  }
  return SIZE_SPECS.filter((spec) => {
    if (spec.orientation !== options.orientation) return false;
    if (spec.slot === "iphone-69") return options.include69;
    return true;
  });
}

export type RenderOptions = {
  orientation: Orientation;
  fit: FitMode;
  background: BackgroundMode;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  title?: string;
  subtitle?: string;
  titlePosition: TitlePosition;
  titleFont: TitleFont;
  format: OutputFormat;
  burnHinge?: boolean;
};

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  orientation: "portrait",
  fit: "cover",
  background: "solid",
  solidColor: "#0B0D12",
  gradientFrom: "#10141C",
  gradientTo: "#2A1A4A",
  title: "",
  subtitle: "",
  titlePosition: "bottom",
  titleFont: "sans",
  format: "png",
  burnHinge: false,
};

/** Reserved inner fold region. UI mask only — not an Apple pixel spec. */
export const INNER_DIVISION_RATIO = 0.06;

export type TextOverlayLayout = {
  x: number;
  yTitle: number;
  ySubtitle: number;
  titleSize: number;
  subtitleSize: number;
  maxWidth: number;
};

/** Keeps generated copy clear of the simulated bezel and, on the open portrait display, the fold. */
export function textOverlayLayout(
  spec: Pick<SizeSpec, "slot" | "orientation" | "width" | "height">,
  position: TitlePosition,
): TextOverlayLayout {
  const avoidsVerticalHinge = spec.slot === "duo-inner" && spec.orientation === "portrait";
  return {
    x: Math.round(spec.width * (avoidsVerticalHinge ? 0.25 : 0.5)),
    yTitle: Math.round(spec.height * (position === "top" ? 0.08 : 0.88)),
    ySubtitle: Math.round(spec.height * (position === "top" ? 0.125 : 0.92)),
    titleSize: Math.round(spec.width * 0.046),
    subtitleSize: Math.round(spec.width * 0.026),
    maxWidth: Math.round(spec.width * (avoidsVerticalHinge ? 0.38 : 0.84)),
  };
}

export function hingeBand(spec: Pick<SizeSpec, "width" | "height" | "orientation">): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (spec.orientation === "portrait") {
    const width = Math.max(1, Math.round(spec.width * INNER_DIVISION_RATIO));
    return { x: Math.round((spec.width - width) / 2), y: 0, width, height: spec.height };
  }
  const height = Math.max(1, Math.round(spec.height * INNER_DIVISION_RATIO));
  return { x: 0, y: Math.round((spec.height - height) / 2), width: spec.width, height };
}
