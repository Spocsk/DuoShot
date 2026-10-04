"use client";

import type { Dispatch, SetStateAction } from "react";
import type { CropTransform, FitMode, Locale, OutputFormat, RenderOptions, SizeSpec } from "@/lib/specs";
import { t } from "@/lib/i18n";
import type { SourceInspect } from "@/lib/pipeline/source-inspect";
import type { SetMeta } from "@/lib/sets-store";
import { DsToggle, Seg } from "@/components/tool/controls";
import { CropControls } from "@/components/tool/preview-card";
import { foldStatusText, type FoldCheck } from "@/components/tool/fold-check";
import type { BillingStatus } from "@/components/tool/use-billing";

type Side = "outer" | "inner";

export function AdjustPanel({
  locale,
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
  locale: Locale;
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
  return <>
          <div className="tool-panel-heading"><h2>{locale === "fr" ? "Ajuster" : "Adjust"}</h2><p>{locale === "fr" ? "Cadrez la vue sélectionnée. Les changements apparaissent sur le canvas." : "Frame the selected view. Changes appear on the canvas."}</p></div>
          <div className="tool-adjust-side" role="group" aria-label={locale === "fr" ? "Vue à ajuster" : "View to adjust"}>
            <button type="button" className={adjustSide === "outer" ? "is-on" : ""} aria-pressed={adjustSide === "outer"} onClick={() => {setAdjustSide("outer"); setMobileView("outer");}}>{locale === "fr" ? "Fermé" : "Closed"}</button>
            <button type="button" className={adjustSide === "inner" ? "is-on" : ""} aria-pressed={adjustSide === "inner"} onClick={() => {setAdjustSide("inner"); setMobileView("inner");}}>{locale === "fr" ? "Ouvert" : "Open"}</button>
          </div>
          <CropControls testId={`preview-${adjustSide}`} locale={locale} previewMode={previewMode} inspect={adjustSide === "outer" ? outerInspect : innerInspect} spec={adjustSide === "outer" ? outerSpec : innerSpec} transform={adjustSide === "outer" ? outerTransform : innerTransform} onTransform={(patch) => updateCropTransform(adjustSide, slideIndex, patch)} />
          {innerSlide ? <div className={`tool-fold-check is-${currentFoldCheck?.status ?? "checking"}`} role="status" data-testid="tool-fold-check"><strong>{locale === "fr" ? "Texte au pli · vue ouverte" : "Fold text · open view"}</strong><span>{foldStatusText(locale, currentFoldCheck)}</span></div> : null}
          <div className="tool-view-settings">
            <div className="review-view-controls">
      <div className="review-view-switch" role="group" aria-label={locale === "fr" ? "Affichage de la composition" : "Composition view"}>
        <button
          type="button"
          className={previewMode === "device" ? "is-on" : ""}
          aria-pressed={previewMode === "device"}
          data-testid="tool-device-view"
          onClick={() => setPreviewMode("device")}
        >
          {t(locale, "review_device_view")}
        </button>
        <button
          type="button"
          className={previewMode === "pixels" ? "is-on" : ""}
          aria-pressed={previewMode === "pixels"}
          data-testid="tool-pixel-view"
          onClick={() => setPreviewMode("pixels")}
        >
          {t(locale, "review_pixel_view")}
        </button>
      </div>
    </div>
          </div>
  </>;
}

export function AdvancedSettings({
  locale,
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
  locale: Locale;
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
  return (
    <details className="tool-advanced mt-5">
      <summary>{locale === "fr" ? "Réglages avancés" : "Advanced settings"}</summary>
      <div className="pt-2">
    <Seg
      label={t(locale, "tool_label_fit")}
      value={globalFit}
      options={[
        { value: "contain", label: t(locale, "tool_fit_contain") },
        { value: "cover", label: t(locale, "tool_fit_cover") },
        { value: "smart", label: t(locale, "tool_fit_smart") },
      ]}
      onChange={(value) => updateGlobalFit(value as FitMode)}
    />
    <Seg
      label={t(locale, "tool_label_bg")}
      value={options.background}
      options={[
        { value: "solid", label: t(locale, "tool_bg_solid") },
        { value: "gradient", label: t(locale, "tool_bg_gradient") },
        { value: "blur", label: t(locale, "tool_bg_blur") },
      ]}
      onChange={(value) => updateOptions({ background: value as RenderOptions["background"] })}
    />
    <div className="ds-field">
      <span className="ds-swatch" style={{ background: options.solidColor }}>
        <input
          type="color"
          value={options.solidColor}
          aria-label={t(locale, "tool_label_bg")}
          onChange={(event) => updateOptions({ solidColor: event.target.value })}
        />
      </span>
    </div>
    <div className="ds-field">
      <label className="ds-label" htmlFor="tool-input-title">
        {t(locale, "tool_label_title")}
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
        {t(locale, "tool_label_subtitle")}
      </label>
      <input
        id="tool-input-subtitle"
        value={options.subtitle}
        onChange={(event) => updateOptions({ subtitle: event.target.value })}
        className="ds-input w-full"
      />
    </div>
    <Seg
      label={t(locale, "tool_label_position")}
      value={options.titlePosition}
      options={[
        { value: "top", label: t(locale, "tool_pos_top") },
        { value: "bottom", label: t(locale, "tool_pos_bottom") },
      ]}
      onChange={(value) => updateOptions({ titlePosition: value as RenderOptions["titlePosition"] })}
    />
    <Seg
      label={t(locale, "tool_label_font")}
      value={options.titleFont}
      options={[
        { value: "sans", label: t(locale, "tool_font_sans") },
        { value: "serif", label: t(locale, "tool_font_serif") },
      ]}
      onChange={(value) => updateOptions({ titleFont: value as RenderOptions["titleFont"] })}
    />
    <Seg
      label={t(locale, "tool_label_format")}
      value={options.format}
      options={[
        { value: "png", label: "PNG-24" },
        { value: "jpeg", label: "JPEG q90" },
      ]}
      onChange={(value) => updateOptions({ format: value as OutputFormat })}
    />
    <div className="ds-field">
      <DsToggle testId="toggle-hinge" pressed={showHinge} onToggle={() => setShowHinge((value) => !value)}>
        {t(locale, "tool_hinge_toggle")}
      </DsToggle>
    </div>
    <div className="ds-field">
      <DsToggle
        testId="toggle-burn-hinge"
        pressed={Boolean(options.burnHinge)}
        onToggle={() => updateOptions({ burnHinge: !options.burnHinge })}
      >
        {t(locale, "tool_burn_hinge")}
      </DsToggle>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t(locale, "tool_burn_hinge_hint")}</p>
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
        {t(locale, "tool_label_69")}
      </DsToggle>
    </div>
    {cloneLabel === "risk" ? (
      <div className="ds-field">
        <DsToggle testId="toggle-assume-clone" pressed={assumeClone} onToggle={() => setAssumeClone((value) => !value)}>
          {t(locale, "tool_assume_clone")}
        </DsToggle>
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t(locale, "tool_assume_clone_hint")}</p>
      </div>
    ) : null}
      </div>
    </details>
  );
}
