import { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { mono, sans } from "./fonts";
import { fitText, textPage } from "./text-layout";

interface TextProps {
  children: string;
  width: number;
  height: number;
  min?: number;
  max?: number;
  color?: string;
  data?: boolean;
  align?: "left" | "center";
}

/** Measure actual font advances; paginate extreme copy rather than clipping it. */
function layout(text: string, width: number, height: number, minimum: number, maximum: number, data: boolean) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) throw new Error("Canvas text measurement unavailable.");
  return fitText(text, width, height, minimum, maximum, (value, size) => {
    context.font = `${data ? 500 : 700} ${size}px "${data ? mono : sans}"`;
    return context.measureText(value).width;
  });
}

export function Text({ children, width, height, min = 52, max = 84, color = "inherit", data = false, align = "center" }: TextProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fitted = useMemo(() => layout(children, width, height, min, max, data), [children, width, height, min, max, data]);
  // Both hooks read the nearest Sequence, including each ZIP file group.
  const page = textPage(frame, durationInFrames, fitted.pages.length);
  return <div style={{ width, height, display: "flex", flexDirection: "column", justifyContent: "center", color, fontFamily: data ? mono : sans, fontWeight: data ? 500 : 700, fontSize: fitted.size, lineHeight: 1.08, letterSpacing: data ? 0 : "-0.045em", textAlign: align }}>
    {fitted.pages[page].map((line, i) => <div key={i} style={{ whiteSpace: "pre" }}>{line || "\u00a0"}</div>)}
  </div>;
}
