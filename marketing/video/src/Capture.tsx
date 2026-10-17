import { useState } from "react";
import { getStaticFiles, Img, staticFile } from "remotion";
import { capturePath, sizes, type CaptureKind } from "./assets";
import { Text } from "./Text";

export function Capture({ reference, kind, scale }: { reference: string; kind: CaptureKind; scale: number }) {
  const [failed, setFailed] = useState(false);
  const file = capturePath(reference);
  const present = getStaticFiles().some((asset) => asset.name === file);
  const { width, height } = sizes[kind];
  const w = width * scale;
  const h = height * scale;
  return <div style={{ position: "relative", width: w, height: h, flexShrink: 0, borderRadius: 26, overflow: "hidden", background: "#e9eff1", boxShadow: "0 22px 55px #17212622" }}>
    {present && !failed ? <Img src={staticFile(file)} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "repeating-linear-gradient(135deg,#d5dcdf 0 22px,#ffffff 22px 44px)", padding: 14 }}>
      <div style={{ background: "#172126", color: "#fff", padding: 10 }}>
        <Text width={w - 48} height={h - 48} min={52} max={52}>{`PLACEHOLDER — capture manquante : ${reference}`}</Text>
      </div>
    </div>}
  </div>;
}
