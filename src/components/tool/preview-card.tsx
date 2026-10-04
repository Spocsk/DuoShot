"use client";

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DeviceCamera } from "@/components/device-camera";
import { duoChassisAspect, type CropTransform, type Orientation, type SizeSpec } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import { compositionMetrics } from "@/lib/pipeline/geometry";
import type { SourceInspect } from "@/lib/pipeline/source-inspect";

export function CropControls({testId, previewMode, inspect, spec, transform, onTransform}: {testId: string; previewMode: "device" | "pixels"; inspect: SourceInspect | null; spec: SizeSpec; transform: CropTransform; onTransform: (patch: Partial<CropTransform>) => void}) {
  const { t, tf } = useI18n();
  if (!inspect) return <p className="tool-adjust-empty">{t("tool_import_view_adjust_its")}</p>;
  const metrics = compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform);
  const cropHint = metrics.fit === "cover" ? t(previewMode === "pixels" ? "tool_crop_drag_hint" : "tool_crop_device_hint") : t("tool_crop_contain_hint");
  const onRangeKey = (event: ReactKeyboardEvent<HTMLInputElement>, axis: "x" | "y") => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? 0.01 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -0.01 : null;
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : delta == null ? null : Math.max(0, Math.min(1, Math.round((transform[axis] + delta) * 100) / 100));
    if (next == null) return;
    event.preventDefault();
    onTransform({[axis]: next});
  };
  const canMoveX = metrics.overflowX >= 1;
  const canMoveY = metrics.overflowY >= 1;
  return <div className="crop-controls tool-crop-controls" data-testid={`${testId}-crop-controls`}>
    <div className="crop-toolbar">
      <div className="crop-fit" role="group" aria-label={t("tool_crop_mode")}>
        <button type="button" className={metrics.fit === "cover" ? "is-on" : ""} aria-pressed={metrics.fit === "cover"} onClick={() => onTransform({fit: "cover"})}>{t("tool_crop_fill")}</button>
        <button type="button" className={metrics.fit === "contain" ? "is-on" : ""} aria-pressed={metrics.fit === "contain"} onClick={() => onTransform({fit: "contain"})}>{t("tool_crop_show_all")}</button>
      </div>
      {transform.fit === "smart" ? <p className="crop-hint" data-testid={`${testId}-smart-result`}>{tf("tool_crop_smart_choice", { mode: t(metrics.fit === "cover" ? "tool_crop_fill" : "tool_crop_show_all") })}</p> : null}
      <button type="button" className="crop-reset" onClick={() => onTransform({x: 0.5, y: 0.5, zoom: 1})}>{t("tool_crop_reset")}</button>
    </div>
    {metrics.fit === "cover" ? <div className="crop-axis-controls">
      <label><span>{"Zoom"} · {Math.round((transform.zoom ?? 1) * 100)} %</span><input type="range" min="100" max="200" value={Math.round((transform.zoom ?? 1) * 100)} onChange={(event) => onTransform({zoom: Number(event.currentTarget.value) / 100})} /></label>
      <label><span>{t("tool_crop_horizontal")}</span><input type="range" min="0" max="100" disabled={!canMoveX} value={Math.round(transform.x * 100)} onChange={(event) => onTransform({x: Number(event.currentTarget.value) / 100})} onKeyDown={(event) => onRangeKey(event, "x")} /></label>
      <label><span>{t("tool_crop_vertical")}</span><input type="range" min="0" max="100" disabled={!canMoveY} value={Math.round(transform.y * 100)} onChange={(event) => onTransform({y: Number(event.currentTarget.value) / 100})} onKeyDown={(event) => onRangeKey(event, "y")} /></label>
      {!canMoveY ? <p className="crop-hint">{t("tool_no_vertical_room_at")}</p> : null}
    </div> : null}
    <div className="crop-readout"><p className={`crop-metrics is-${metrics.severity}`} data-testid={`${testId}-metrics`}>{tf("tool_crop_metrics", {crop: metrics.cropPercent.toFixed(1), scale: metrics.scale.toFixed(2)})}</p><p className="crop-hint">{cropHint}</p></div>
  </div>;
}

export function PreviewCard({
  testId,
  label,
  src,
  inspect,
  kind,
  spec,
  orientation,
  previewMode,
  hinge = false,
  slide,
  transform,
  onTransform,
  onImportFiles,
}: {
  testId: string;
  label: string;
  src?: string;
  inspect: SourceInspect | null;
  kind: "outer" | "inner";
  spec: { width: number; height: number };
  orientation: Orientation;
  previewMode: "device" | "pixels";
  hinge?: boolean;
  slide: number;
  transform: CropTransform;
  onTransform: (patch: Partial<CropTransform>) => void;
  onImportFiles: (files: FileList | null) => void;
}) {
  const { t } = useI18n();
  const dragRef = useRef<{ pointerId: number; x: number; y: number; focusX: number; focusY: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const effectiveFit = inspect ? compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform).fit : transform.fit;
  const canvasAspect = previewMode === "pixels"
    ? `${spec.width}/${spec.height}`
    : duoChassisAspect(kind, orientation);
  return (
    <figure data-testid={testId} data-slide={slide}>
      <figcaption className="duo-caption text-left">{label}</figcaption>
      <div className="preview-stage">
        <div
          className={`preview-glass t-resize ${kind === "outer" ? "preview-outer" : "preview-inner"} ${src ? "t-skel is-revealed" : "preview-empty"} ${kind === "inner" && hinge && src ? "is-hinge" : "hinge-off"} ${src && previewMode === "pixels" && effectiveFit === "cover" ? "is-draggable" : ""}${!src && over ? " is-over" : ""}`}
          onDragOver={src ? undefined : (event) => { event.preventDefault(); setOver(true); }}
          onDragLeave={src ? undefined : () => setOver(false)}
          onDrop={src ? undefined : (event) => { event.preventDefault(); setOver(false); onImportFiles(event.dataTransfer.files); }}
          data-testid={`${testId}-canvas`}
          data-aspect={canvasAspect}
          onPointerDown={(event) => {
            if (!src || previewMode !== "pixels" || effectiveFit !== "cover") return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              focusX: transform.x,
              focusY: transform.y,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (!inspect) return;
            const metrics = compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform);
            onTransform({
              x: metrics.overflowX >= 1 ? drag.focusX - (event.clientX - drag.x) * spec.width / Math.max(rect.width * metrics.overflowX, 1) : drag.focusX,
              y: metrics.overflowY >= 1 ? drag.focusY - (event.clientY - drag.y) * spec.height / Math.max(rect.height * metrics.overflowY, 1) : drag.focusY,
            });
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {src ? (
            <>
              <div className="t-skel-skeleton" aria-hidden="true">
                <span />
              </div>
              <div className="t-skel-content">
                {/* User-generated preview from canvas.toDataURL */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} />
              </div>
            </>
          ) : (
            <div className="preview-empty-copy">
              <span className="preview-empty-label">{label}</span>
              <span className="preview-empty-size">{spec.width} × {spec.height}</span>
              <button type="button" className="tool-empty-action" onClick={() => inputRef.current?.click()}>{t("tool_step_import")}</button>
              <span className="preview-empty-drop">{t("tool_drop_png_jpeg")}</span>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg" multiple className="sr-only" aria-label={`${t("tool_step_import")} ${label}`} onChange={(event) => { onImportFiles(event.target.files); event.target.value = ""; }} />
            </div>
          )}
          {kind === "outer" && previewMode === "device" ? <DeviceCamera /> : null}
          {kind === "inner" ? <span className="division" aria-hidden="true" /> : null}
        </div>
      </div>
    </figure>
  );
}
