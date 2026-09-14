export const SPECS_VERSION_DATE = "2026-09-12";
export const POLICY_VERSION = "2026-09-13";
export const MAX_IMAGES = 10;
export const WARN_MIN_IMAGES = 3;
export const JPEG_QUALITY = 90;
export const SIGNED_URL_SECONDS = 60 * 60;
export const STORAGE_RETENTION_HOURS = 24;

export type Locale = "fr" | "en";
export type Orientation = "portrait" | "landscape";
export type FitMode = "contain" | "cover" | "smart";
export type BackgroundMode = "solid" | "gradient" | "blur";
export type TitlePosition = "top" | "bottom";
export type TitleFont = "sans" | "serif";
export type OutputFormat = "png" | "jpeg";
export type DeviceSlot = "duo-outer" | "duo-inner" | "iphone-69";
export type PlanId = "free" | "indie" | "studio";

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

export const APP_STORE_DISCLAIMER_233 =
  "Apple App Store Review Guideline 2.3.3 : les captures doivent représenter l’app avec précision. DuoShot redimensionne et compose tes visuels ; il ne fabrique pas de fausses fonctionnalités. Vérifie chaque set avant soumission.";

export function canUse69(plan: PlanId): boolean {
  return plan === "indie" || plan === "studio";
}

export function zipFolderName(slot: DeviceSlot, orientation: Orientation): string {
  return `${slot}-${orientation}`;
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
  fit: "contain",
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
