import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "@/lib/specs";
import { SITE_PITCH_EN, SITE_PITCH_FR } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function ogImage(locale: Locale) {
  const serif = await readFile(path.join(process.cwd(), "src/lib/pipeline/fonts/serif-bold.ttf"));
  const pitch = locale === "fr" ? SITE_PITCH_FR : SITE_PITCH_EN;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f4f1ea",
          color: "#141414",
          padding: "64px 72px",
          fontFamily: "DuoShot",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 540, justifyContent: "space-between" }}>
          <div style={{ fontSize: 36 }}>DuoShot</div>
          <div style={{ fontSize: 36, lineHeight: 1.18, letterSpacing: "-0.03em" }}>{pitch}</div>
          <div style={{ fontSize: 22, color: "#6b645c" }}>1398×2034 · 2007×2853 · duo-outer-portrait/</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "flex-end", gap: 24 }}>
          <div
            style={{
              width: 168,
              height: 244,
              borderRadius: "12px 42px 42px 12px",
              background: "linear-gradient(165deg, #d4c3ae 0%, #3e4d54 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "20px 16px",
              color: "#f7f3ec",
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: "0.18em" }}>HARBOR</div>
            <div style={{ fontSize: 28, lineHeight: 1.1 }}>North</div>
            <div style={{ fontSize: 32, lineHeight: 1 }}>1.4 m</div>
          </div>
          <div
            style={{
              width: 280,
              height: 200,
              borderRadius: 28,
              background: "linear-gradient(165deg, #9aa8a4 0%, #1c2428 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "22px 24px",
              color: "#f7f3ec",
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: "0.18em" }}>TODAY</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 36, lineHeight: 1 }}>North</div>
              <div style={{ fontSize: 18, opacity: 0.82 }}>1.4 m · 12 s</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "DuoShot", data: serif, style: "normal", weight: 700 }],
    },
  );
}
