import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";
import { OG } from "./theme";

/** The selected "Le pli" mark, matching src/app/icon.svg. */
export function OgMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" fill={OG.sea} />
      <rect x="12.3" y="14.3" width="14.5" height="35.4" rx="2.6" fill="#ffffff" />
      <rect x="29.2" y="14.3" width="22.4" height="35.4" rx="2.6" fill="#ffffff" />
    </svg>
  );
}

/** Wrappable text: one box per word, so line breaks stay possible once spaces are no-break. */
function Words({ text, space }: { text: string; space: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: space }}>
      {text.split(" ").map((word, i) => (
        <div key={i} style={{ display: "flex" }}>
          {word}
        </div>
      ))}
    </div>
  );
}

/** The public domain, also hard-coded in next.config.ts; a preview build must not print localhost. */
const DOMAIN = "duoshot.site";

/**
 * One 1200 × 630 card: eyebrow, title and optional lead on the left, the DuoShot signature
 * bottom left, and `art` positioned freely over the right-hand side.
 */
export function OgFrame({
  eyebrow,
  title,
  lead,
  titleSize = 68,
  textWidth = 500,
  art,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  titleSize?: number;
  textWidth?: number;
  art: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: OG.canvas,
        backgroundImage:
          "radial-gradient(circle at 88% 38%, rgba(217, 229, 232, 0.95) 0%, rgba(217, 229, 232, 0) 52%), " +
          "radial-gradient(circle at 0% 100%, rgba(227, 238, 240, 0.7) 0%, rgba(227, 238, 240, 0) 40%)",
        color: OG.ink,
        fontFamily: "Geist",
      }}
    >
      {art}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 66,
          bottom: 60,
          width: textWidth,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 600, color: OG.sea }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: OG.sea }} />
          <div style={{ display: "flex" }}>{eyebrow}</div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: "-0.045em",
            flexDirection: "column",
          }}
        >
          {/* A "\n" in the title forces a line break; each line still wraps on its own. */}
          {title.split("\n").map((line) => (
            <Words key={line} text={line} space="0.22em" />
          ))}
        </div>
        {lead ? (
          <div style={{ display: "flex", marginTop: 24, fontSize: 25, fontWeight: 500, lineHeight: 1.32, color: OG.muted }}>
            <Words text={lead} space="0.25em" />
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto", gap: 14 }}>
          <OgMark size={40} />
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: "-0.035em" }}>{SITE_NAME}</div>
          <div style={{ width: 1, height: 22, marginLeft: 4, marginRight: 4, background: OG.lineStrong }} />
          <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 19, color: OG.muted }}>{DOMAIN}</div>
        </div>
      </div>
    </div>
  );
}
