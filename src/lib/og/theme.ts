/** Studio clair tokens (src/app/globals.css), repeated here because Satori cannot read CSS variables. */
export const OG = {
  canvas: "#f7f9fa",
  ink: "#172126",
  muted: "#536168",
  line: "#d5dcdf",
  lineStrong: "#b9c5ca",
  surface: "#ffffff",
  mist: "#e9eff1",
  sea: "#245765",
  seaSoft: "#e3eef0",
  seaWash: "#d9e5e8",
  seaLine: "#8fb0b8",
  ok: "#4d8b7b",
  okSoft: "#dff0e9",
  review: "#bc9664",
  reviewSoft: "#f6ebdc",
  warning: "#88502f",
  deep: "#21333b",
  /** Harbor screen colours (studio.css). */
  harborText: "#f7f3ec",
} as const;

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** The Harbor screen: warm glow top right, deep water bottom left, teal body. */
export const HARBOR_SCREEN =
  "radial-gradient(circle at 77% 4%, rgba(251, 228, 181, 0.72), rgba(251, 228, 181, 0) 62%), " +
  "radial-gradient(circle at 18% 100%, rgba(13, 48, 62, 0.62), rgba(13, 48, 62, 0) 62%), " +
  "linear-gradient(150deg, #87a6aa 0%, #6b929c 43%, #1d4659 100%)";

export const CHASSIS = "linear-gradient(145deg, #343d42 0%, #0f1418 40%, #282f33 100%)";
