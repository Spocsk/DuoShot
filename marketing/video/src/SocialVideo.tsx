import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, getStaticFiles, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { captureKind, sizes, type CaptureKind } from "./assets";
import { Capture } from "./Capture";
import { useFonts, sans } from "./fonts";
import type { Scene, VideoScript } from "./schema";
import { Text } from "./Text";
import { sceneTiming } from "./timing";
import { captureScale, contentWidth, dimensionTop, layout, outerToInner, outerToInnerDimensions, pairScale, reframeDimensions, reframeState, sceneOpacity, stageHeight, stageTop, zipPages } from "./layout";

const C = { canvas: "#f7f9fa", ink: "#172126", muted: "#536168", line: "#d5dcdf", surface: "#ffffff", mist: "#e9eff1", sea: "#245765", seaSoft: "#e3eef0", deep: "#21333b" };
const stage: CSSProperties = { position: "absolute", top: stageTop, left: layout.safe.side, width: contentWidth, height: stageHeight, display: "flex", alignItems: "center", justifyContent: "center", gap: layout.pairGap };

function Positioned({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

function Dimension({ kind, width = contentWidth }: { kind: CaptureKind; width?: number }) {
  const size = sizes[kind];
  return <Text width={width} height={layout.dimensionHeight} data min={28} max={44} color={C.muted}>{`${size.width}×${size.height}`}</Text>;
}

function Single({ reference, kind }: { reference: string; kind: CaptureKind }) {
  return <><div style={stage}><Capture reference={reference} kind={kind} scale={captureScale} /></div>
    <Positioned style={{ left: layout.safe.side, top: dimensionTop }}><Dimension kind={kind} /></Positioned></>;
}

function Pair({ outer, inner }: { outer: string; inner: string }) {
  // Both screenshots use the same pixel-to-video scale.
  const scale = pairScale(["outer", "inner"]);
  return <div style={{ ...stage, alignItems: "flex-start" }}>
    {[{ reference: outer, kind: "outer" as const }, { reference: inner, kind: "inner" as const }].map(({ reference, kind }) =>
      <div key={kind} style={{ width: sizes[kind].width * scale }}>
        <div style={{ height: stageHeight, display: "flex", alignItems: "center" }}><Capture reference={reference} kind={kind} scale={scale} /></div>
        <div style={{ marginTop: layout.dimensionGap }}><Dimension kind={kind} width={sizes[kind].width * scale} /></div>
      </div>)}
  </div>;
}

function TransitionDimensions({ weights }: { weights: Partial<Record<CaptureKind, number>> }) {
  return <Positioned style={{ left: layout.safe.side, top: dimensionTop }}>
    {Object.entries(weights).map(([kind, opacity]) => <div key={kind} style={{ position: "absolute", opacity }}><Dimension kind={kind as CaptureKind} /></div>)}
  </Positioned>;
}

function GrowingScreens({ outer, inner, progress, outerOpacity = 1 - progress }: { outer: string; inner: string; progress: number; outerOpacity?: number }) {
  const width = (sizes.outer.width + (sizes.inner.width - sizes.outer.width) * progress) * captureScale;
  const height = (sizes.outer.height + (sizes.inner.height - sizes.outer.height) * progress) * captureScale;
  return <div style={{ position: "absolute", width, height, overflow: "hidden", borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", opacity: outerOpacity }}><Capture reference={outer} kind="outer" scale={captureScale} /></div>
    <div style={{ position: "absolute", opacity: progress }}><Capture reference={inner} kind="inner" scale={captureScale} /></div>
  </div>;
}

function Morph({ scene }: { scene: Extract<Scene, { type: "outer-to-inner" }> }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = outerToInner(frame, fps, durationInFrames);
  return <><div style={stage}><GrowingScreens outer={scene.outer} inner={scene.inner} progress={progress} /></div>
    <TransitionDimensions weights={outerToInnerDimensions(frame, fps, durationInFrames)} /></>;
}

function Reframe({ scene }: { scene: Extract<Scene, { type: "reframe" }> }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const state = reframeState(frame, durationInFrames);
  const width = interpolate(state.crop, [0, 1], [sizes.classic.width * captureScale, sizes.outer.width * captureScale]);
  const height = interpolate(state.crop, [0, 1], [sizes.classic.height * captureScale, sizes.outer.height * captureScale]);
  return <><div style={stage}>
    <div style={{ position: "absolute", width, height, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 26, opacity: state.classic }}>
      {/* Zoom and trim the simulator letterbox before revealing the exported pixels. */}
      <Capture reference={scene.classic} kind="classic" scale={width / sizes.classic.width} />
    </div>
    <GrowingScreens outer={scene.outer} inner={scene.inner} progress={state.inner} outerOpacity={state.outer} />
  </div><TransitionDimensions weights={reframeDimensions(frame, durationInFrames)} /></>;
}

function BeforeAfter({ scene, lang }: { scene: Extract<Scene, { type: "before-after" }>; lang: VideoScript["lang"] }) {
  const captures = [{ reference: scene.before, label: scene.beforeLabel ?? (lang === "fr" ? "Avant" : "Before") }, { reference: scene.after, label: scene.afterLabel ?? (lang === "fr" ? "Après" : "After") }];
  const columnWidth = (contentWidth - layout.pairGap) / 2;
  const imageHeight = stageHeight - 100;
  const scale = pairScale(captures.map(({ reference }) => captureKind(reference)), imageHeight, true);
  return <div style={{ ...stage, alignItems: "flex-start" }}>
    {captures.map(({ reference, label }, i) => {
      const kind = captureKind(reference);
      return <div key={i} style={{ width: columnWidth, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ height: imageHeight, display: "flex", alignItems: "center" }}><Capture reference={reference} kind={kind} scale={scale} /></div>
        <div style={{ marginTop: layout.dimensionGap }}><Dimension kind={kind} width={columnWidth} /></div>
        <Text width={columnWidth} height={100} min={32} max={48}>{label}</Text>
      </div>;
    })}
  </div>;
}

function ZipFiles({ files }: { files: Extract<Scene, { type: "zip" }>["files"] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Positioned style={{ top: 835, left: layout.safe.side, width: contentWidth }}>
    {files.map((file, i) => {
      const arrival = spring({ frame: Math.max(0, frame - i * 3), fps, config: { damping: 24, stiffness: 100 } });
      return <div key={file.name + i} style={{ marginBottom: 16, padding: "8px 24px", height: 150, boxSizing: "border-box", border: `2px solid ${C.line}`, borderRadius: 20, background: C.surface, opacity: arrival, transform: `translateY(${(1 - arrival) * -28}px)` }}>
        <Text width={contentWidth - 52} height={72} data min={24} max={48}>{file.name}</Text>
        <Text width={contentWidth - 52} height={60} data min={24} max={44} color={C.muted}>{file.dims ? `${file.dims} · ${file.format.toUpperCase()}` : file.format.toUpperCase()}</Text>
      </div>;
    })}
  </Positioned>;
}

function Zip({ scene }: { scene: Extract<Scene, { type: "zip" }> }) {
  const { durationInFrames } = useVideoConfig();
  return <>
    <Positioned style={{ top: 590, left: 410 }}>
      <svg width="260" height="220" viewBox="0 0 260 220" role="img" aria-label="ZIP">
        <path d="M25 20H170L235 85V200H25Z" fill={C.surface} stroke={C.line} strokeWidth="5" />
        <path d="M170 20V85H235" fill={C.mist} stroke={C.line} strokeWidth="5" />
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={90 + (i % 2) * 15} y={27 + i * 20} width="15" height="16" fill={C.sea} />)}
        <rect x="50" y="145" width="155" height="60" rx="10" fill={C.seaSoft} />
        <text x="127" y="190" textAnchor="middle" fill={C.ink} fontFamily={sans} fontSize="52" fontWeight="700">ZIP</text>
      </svg>
    </Positioned>
    {zipPages(scene.files.length, durationInFrames).map(({ from, durationInFrames: duration, start, end }) =>
      <Sequence key={start} from={from} durationInFrames={duration}>
        <ZipFiles files={scene.files.slice(start, end)} />
      </Sequence>)}
  </>;
}

function SceneView({ scene, lang, openingTitle }: { scene: Scene; lang: VideoScript["lang"]; openingTitle: boolean }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = openingTitle ? 1 : spring({ frame, fps, config: { damping: 26, stiffness: 100, mass: 0.8 } });
  const fade = sceneOpacity(frame, durationInFrames, openingTitle);
  const showHeading = scene.type !== "outer-to-inner" || outerToInner(frame, fps, durationInFrames) === 1;
  const dark = scene.type === "title" && scene.theme === "dark";
  let body: ReactNode;
  switch (scene.type) {
    case "title":
      body = <Positioned style={{ left: 72, top: 430 }}>
        <Text width={936} height={660} min={84} max={132}>{scene.text}</Text>
        {scene.subtitle ? <Text width={936} height={280} max={64} color={dark ? C.mist : C.muted}>{scene.subtitle}</Text> : null}
      </Positioned>;
      break;
    case "end": {
      const hasLogo = scene.logo && getStaticFiles().some((file) => file.name === "brand/duoshot-logo.png");
      body = <>
        {hasLogo ? <Positioned style={{ top: 470, left: 420 }}><Img src={staticFile("brand/duoshot-logo.png")} style={{ width: 240, height: 240, objectFit: "contain" }} /></Positioned> : null}
        <Positioned style={{ left: 72, top: 770 }}><Text width={936} height={620} min={84} max={104}>{scene.text}</Text></Positioned>
      </>;
      break;
    }
    case "outer": case "inner": case "classic": body = <Single reference={scene.capture} kind={scene.type} />; break;
    case "side-by-side": body = <Pair outer={scene.outer} inner={scene.inner} />; break;
    case "outer-to-inner": body = <Morph scene={scene} />; break;
    case "reframe": body = <Reframe scene={scene} />; break;
    case "before-after": body = <BeforeAfter scene={scene} lang={lang} />; break;
    case "zip": body = <Zip scene={scene} />; break;
  }
  return <AbsoluteFill style={{ background: dark ? C.deep : C.canvas, color: dark ? C.surface : C.ink, fontFamily: sans }}>
    <AbsoluteFill style={{ opacity: fade, transform: `translateY(${scene.type === "title" || scene.type === "end" ? (1 - enter) * 18 : 0}px)` }}>
      {showHeading && scene.type !== "title" && scene.type !== "end" && scene.text ? <Positioned style={{ left: layout.safe.side, top: layout.safe.top }}><Text width={contentWidth} height={layout.headingHeight} max={96}>{scene.text}</Text></Positioned> : null}
      {body}
    </AbsoluteFill>
  </AbsoluteFill>;
}

export function SocialVideo(script: VideoScript) {
  const ready = useFonts();
  const timing = sceneTiming(script);
  if (!ready) return null;
  return <AbsoluteFill style={{ background: C.canvas }}>{script.scenes.map((scene, index) =>
    <Sequence key={index} from={timing[index].from} durationInFrames={timing[index].durationInFrames}>
      <SceneView scene={scene} lang={script.lang} openingTitle={index === 0 && scene.type === "title"} />
    </Sequence>)}</AbsoluteFill>;
}
