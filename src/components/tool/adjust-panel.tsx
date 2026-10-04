"use client";

import type { Dispatch, SetStateAction } from "react";
import { overlayTextColor, type CropTransform, type FitMode, type OutputFormat, type RenderOptions, type SizeSpec, type TextColor } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { SourceInspect } from "@/lib/pipeline/source-inspect";
import type { SetMeta } from "@/lib/sets-store";
import { DsToggle, Seg } from "@/components/tool/controls";
import { CropControls } from "@/components/tool/preview-card";
import { foldStatusText, type FoldCheck } from "@/components/tool/fold-check";
import type { BillingStatus } from "@/components/tool/use-billing";

type Side = "outer" | "inner";

export function AdjustPanel({
  adjustSide,
  setAdjustSide,
  setMobileView,
  previewMode,
  setPreviewMode,
  outerInspect,
  innerInspect,
  outerSpec,
  innerSpec,
  outerTransform,
  innerTransform,
  updateCropTransform,
  slideIndex,
  innerSlide,
  currentFoldCheck,
}: {
  adjustSide: Side;
  setAdjustSide: Dispatch<SetStateAction<Side>>;
  setMobileView: Dispatch<SetStateAction<"outer" | "inner" | "compare">>;
  previewMode: "device" | "pixels";
  setPreviewMode: Dispatch<SetStateAction<"device" | "pixels">>;
  outerInspect: SourceInspect | null;
  innerInspect: SourceInspect | null;
  outerSpec: SizeSpec;
  innerSpec: SizeSpec;
  outerTransform: CropTransform;
  innerTransform: CropTransform;
  updateCropTransform: (side: Side, index: number, patch: Partial<CropTransform>) => void;
  slideIndex: number;
  innerSlide: File | undefined;
  currentFoldCheck: FoldCheck | undefined;
}) {
  const { t } = useI18n();
  return <>
          <div className="tool-panel-heading"><h2>{t("tool_step_adjust")}</h2><p>{t("tool_frame_selected_view_changes")}</p></div>
          <div className="tool-adjust-side" role="group" aria-label={t("tool_view_adjust")}>
            <button type="button" className={adjustSide === "outer" ? "is-on" : ""} aria-pressed={adjustSide === "outer"} onClick={() => {setAdjustSide("outer"); setMobileView("outer");}}>{t("tool_closed")}</button>
            <button type="button" className={adjustSide === "inner" ? "is-on" : ""} aria-pressed={adjustSide === "inner"} onClick={() => {setAdjustSide("inner"); setMobileView("inner");}}>{t("tool_open")}</button>
          </div>
          <CropControls testId={`preview-${adjustSide}`} previewMode={previewMode} inspect={adjustSide === "outer" ? outerInspect : innerInspect} spec={adjustSide === "outer" ? outerSpec : innerSpec} transform={adjustSide === "outer" ? outerTransform : innerTransform} onTransform={(patch) => updateCropTransform(adjustSide, slideIndex, patch)} />
          {innerSlide ? <div className={`tool-fold-check is-${currentFoldCheck?.status ?? "checking"}`} role="status" data-testid="tool-fold-check"><strong>{t("tool_fold_text_open_view")}</strong><span>{foldStatusText(t, currentFoldCheck)}</span></div> : null}
          <div className="tool-view-settings">
            <div className="review-view-controls">
      <div className="review-view-switch" role="group" aria-label={t("tool_composition_view")}>
        <button
          type="button"
          className={previewMode === "device" ? "is-on" : ""}
          aria-pressed={previewMode === "device"}
          data-testid="tool-device-view"
          onClick={() => setPreviewMode("device")}
        >
          {t("review_device_view")}
        </button>
        <button
          type="button"
          className={previewMode === "pixels" ? "is-on" : ""}
          aria-pressed={previewMode === "pixels"}
          data-testid="tool-pixel-view"
          onClick={() => setPreviewMode("pixels")}
        >
          {t("review_pixel_view")}
        </button>
      </div>
    </div>
          </div>
  </>;
}

export function AdvancedSettings({
  globalFit,
  updateGlobalFit,
  options,
  updateOptions,
  showHinge,
  setShowHinge,
  include69,
  patchActive,
  setZipUrl,
  billing,
  setPaywall,
  cloneLabel,
  assumeClone,
  setAssumeClone,
}: {
  globalFit: FitMode;
  updateGlobalFit: (fit: FitMode) => void;
  options: RenderOptions;
  updateOptions: (patch: Partial<RenderOptions>) => void;
  showHinge: boolean;
  setShowHinge: Dispatch<SetStateAction<boolean>>;
  include69: boolean;
  patchActive: (patch: Partial<SetMeta>) => void;
  setZipUrl: Dispatch<SetStateAction<string | null>>;
  billing: BillingStatus | null;
  setPaywall: Dispatch<SetStateAction<"trial" | "69" | null>>;
  cloneLabel: string | null;
  assumeClone: boolean;
  setAssumeClone: Dispatch<SetStateAction<boolean>>;
}) {
  const { t } = useI18n();
  return (
    <details className="tool-advanced mt-5">
      <summary>{t("tool_advanced_settings")}</summary>
      <div className="pt-2">
    <Seg
      label={t("tool_label_fit")}
      value={globalFit}
      options={[
        { value: "contain", label: t("tool_fit_contain") },
        { value: "cover", label: t("tool_fit_cover") },
        { value: "smart", label: t("tool_fit_smart") },
      ]}
      onChange={(value) => updateGlobalFit(value as FitMode)}
    />
    <Seg
      label={t("tool_label_bg")}
      value={options.background}
      options={[
        { value: "solid", label: t("tool_bg_solid") },
        { value: "gradient", label: t("tool_bg_gradient") },
        { value: "blur", label: t("tool_bg_blur") },
      ]}
      onChange={(value) => updateOptions({ background: value as RenderOptions["background"] })}
    />
    <div className="ds-field">
      <span className="ds-swatch" style={{ background: options.solidColor }}>
        <input
          type="color"
          value={options.solidColor}
          aria-label={t("tool_label_bg")}
          onChange={(event) => updateOptions({ solidColor: event.target.value })}
        />
      </span>
    </div>
    <div className="ds-field">
      <label className="ds-label" htmlFor="tool-input-title">
        {t("tool_label_title")}
      </label>
      <input
        id="tool-input-title"
        value={options.title}
        onChange={(event) => updateOptions({ title: event.target.value })}
        className="ds-input w-full"
      />
    </div>
    <div className="ds-field">
      <label className="ds-label" htmlFor="tool-input-subtitle">
        {t("tool_label_subtitle")}
      </label>
      <input
        id="tool-input-subtitle"
        value={options.subtitle}
        onChange={(event) => updateOptions({ subtitle: event.target.value })}
        className="ds-input w-full"
      />
    </div>
    <Seg
      label={t("tool_label_position")}
      value={options.titlePosition}
      options={[
        { value: "top", label: t("tool_pos_top") },
        { value: "bottom", label: t("tool_pos_bottom") },
      ]}
      onChange={(value) => updateOptions({ titlePosition: value as RenderOptions["titlePosition"] })}
    />
    <Seg
      label={t("tool_label_font")}
      value={options.titleFont}
      options={[
        { value: "sans", label: t("tool_font_sans") },
        { value: "serif", label: t("tool_font_serif") },
      ]}
      onChange={(value) => updateOptions({ titleFont: value as RenderOptions["titleFont"] })}
    />
    <TextColorField options={options} updateOptions={updateOptions} />
    <Seg
      label={t("tool_label_format")}
      value={options.format}
      options={[
        { value: "png", label: "PNG-24" },
        { value: "jpeg", label: "JPEG q90" },
      ]}
      onChange={(value) => updateOptions({ format: value as OutputFormat })}
    />
    <div className="ds-field">
      <DsToggle testId="toggle-hinge" pressed={showHinge} onToggle={() => setShowHinge((value) => !value)}>
        {t("tool_hinge_toggle")}
      </DsToggle>
    </div>
    <div className="ds-field">
      <DsToggle
        testId="toggle-burn-hinge"
        pressed={Boolean(options.burnHinge)}
        onToggle={() => updateOptions({ burnHinge: !options.burnHinge })}
      >
        {t("tool_burn_hinge")}
      </DsToggle>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t("tool_burn_hinge_hint")}</p>
    </div>
    <div className="ds-field">
      <DsToggle
        testId="toggle-69"
        pressed={include69}
        onToggle={() => {
          const next = !include69;
          patchActive({ include69: next });
          setZipUrl(null);
          if (next && (!billing || billing.canUse69 === false)) setPaywall("69");
        }}
      >
        {t("tool_label_69")}
      </DsToggle>
    </div>
    {cloneLabel === "risk" ? (
      <div className="ds-field">
        <DsToggle testId="toggle-assume-clone" pressed={assumeClone} onToggle={() => setAssumeClone((value) => !value)}>
          {t("tool_assume_clone")}
        </DsToggle>
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t("tool_assume_clone_hint")}</p>
      </div>
    ) : null}
      </div>
    </details>
  );
}

/** Burned-in text colour: Auto keeps the contrast rule from specs.ts; the choice is saved with the set and sent to the renderer. */
function TextColorField({ options, updateOptions }: { options: RenderOptions; updateOptions: (patch: Partial<RenderOptions>) => void }) {
  const { t } = useI18n();
  const current = options.textColor ?? "auto";
  const mode = current.startsWith("#") ? "custom" : current;
  const resolved = overlayTextColor(options);
  return <>
    <Seg
      label={t("tool_text_color")}
      value={mode}
      options={[
        { value: "auto", label: t("tool_text_color_auto") },
        { value: "ink", label: t("tool_text_color_ink") },
        { value: "white", label: t("tool_text_color_white") },
        { value: "custom", label: t("tool_text_color_custom") },
      ]}
      onChange={(value) => updateOptions({ textColor: value === "custom" ? (resolved.toLowerCase() as TextColor) : (value as TextColor) })}
    />
    <div className="tool-text-color-readout" data-testid="tool-text-color">
      <span className="tool-text-color-chip" style={{ background: resolved }} aria-hidden="true" />
      <code>{resolved}</code>
      {mode === "custom" ? (
        <label className="tool-text-color-custom">
          <span>{t("tool_text_color_pick")}</span>
          <input type="color" value={resolved.toLowerCase()} data-testid="tool-text-color-input" onChange={(event) => updateOptions({ textColor: event.target.value as TextColor })} />
        </label>
      ) : null}
    </div>
  </>;
}
