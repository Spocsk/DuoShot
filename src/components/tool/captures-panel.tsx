"use client";

import type { Dispatch, SetStateAction } from "react";
import { MAX_IMAGES, WARN_MIN_IMAGES, type Locale, type SizeSpec } from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import type { SetMeta } from "@/lib/sets-store";
import { DsToggle } from "@/components/tool/controls";
import { DropZone } from "@/components/tool/drop-zone";

type FileInput = FileList | File[] | DataTransfer | null;

export function CapturesPanel({
  locale,
  active,
  outerSpec,
  innerSpec,
  outerFiles,
  innerFiles,
  effectiveInner,
  sameSet,
  cloneForced,
  unpaired,
  warning,
  sameSetOpen,
  setSameSetOpen,
  onSideFiles,
  patchActive,
  setZipUrl,
}: {
  locale: Locale;
  active: SetMeta | undefined;
  outerSpec: SizeSpec;
  innerSpec: SizeSpec;
  outerFiles: File[];
  innerFiles: File[];
  effectiveInner: File[];
  sameSet: boolean;
  cloneForced: boolean;
  unpaired: boolean;
  warning: string | null;
  sameSetOpen: boolean;
  setSameSetOpen: Dispatch<SetStateAction<boolean>>;
  onSideFiles: (side: "outer" | "inner", list: FileInput) => Promise<void>;
  patchActive: (patch: Partial<SetMeta>) => void;
  setZipUrl: Dispatch<SetStateAction<string | null>>;
}) {
  return <>
          <div className="tool-panel-heading"><h2>{locale === "fr" ? "Vos captures" : "Your screenshots"}</h2><p>{locale === "fr" ? "Importez les vues de votre app. Jusqu’à 10 paires." : "Import your app screens. Up to 10 pairs."}</p></div>
          <div id="tool-import" className="tool-import-stack">
            <div className="mt-5 grid gap-4 md:grid-cols-2">
      <DropZone
        testId="drop-outer"
        label={tf(locale, "tool_drop_outer", { w: outerSpec.width, h: outerSpec.height })}
        hint={t(locale, "tool_drop")}
        count={outerFiles.length}
        names={outerFiles.map((file) => file.name)}
        onFiles={(list) => onSideFiles("outer", list)}
      />
      <DropZone
        testId="drop-inner"
        label={tf(locale, "tool_drop_inner", { w: innerSpec.width, h: innerSpec.height })}
        hint={t(locale, "tool_drop")}
        count={sameSet ? outerFiles.length : innerFiles.length}
        names={(sameSet ? outerFiles : innerFiles).map((file) => file.name)}
        disabled={sameSet}
        onFiles={(list) => onSideFiles("inner", list)}
      />
    </div>
    {cloneForced ? (
      <p className="ds-warn-clone" role="alert" data-testid="warn-clone">
        {t(locale, "tool_warn_clone")}
      </p>
    ) : null}
    {unpaired ? (
      <p className="ds-warn" role="status" data-testid="warn-unpaired">
        {t(locale, "tool_warn_unpaired")}
      </p>
    ) : null}
    {warning === "TOO_FEW" ? (
      <p className="ds-warn" role="status" data-testid="warn-too-few">
        {t(locale, "tool_warn")} ({WARN_MIN_IMAGES}+)
      </p>
    ) : null}
    {Math.max(outerFiles.length, effectiveInner.length) >= MAX_IMAGES ? (
      <p className="ds-warn" role="status">
        {t(locale, "tool_cap")}
      </p>
    ) : null}
          </div>
    <div className="t-acc mt-6" data-testid="same-set-details" data-open={sameSet || sameSetOpen ? "true" : "false"}>
      <button
        type="button"
        className="t-acc-head flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm text-[var(--muted)]"
        aria-expanded={sameSet || sameSetOpen}
        onClick={() => setSameSetOpen((open) => !open)}
      >
        <span>{t(locale, "tool_same_set")}</span>
        <span className="t-acc-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6.5L8 10.5L12 6.5" />
          </svg>
        </span>
      </button>
      <div className="t-acc-panel">
        <div className="t-acc-panel-inner">
          <div className="mt-3 pb-2">
            <DsToggle
              testId="toggle-same-set"
              pressed={sameSet}
              onToggle={() => {
                setSameSetOpen(true);
                patchActive({ sameSet: !sameSet });
                setZipUrl(null);
              }}
            >
              {t(locale, "tool_same_set")}
            </DsToggle>
          </div>
        </div>
      </div>
    </div>
          <div className="tool-panel-fields">
            <div className="ds-field">
      <label className="ds-label" htmlFor="tool-input-app">
        {t(locale, "tool_label_app")}
      </label>
      <input
        id="tool-input-app"
        value={active?.appName ?? active?.name ?? ""}
        placeholder="App"
        onChange={(event) => { patchActive({ appName: event.target.value }); setZipUrl(null); }}
        className="ds-input w-full"
      />
    </div>
            <div className="ds-field">
      <label className="ds-label" htmlFor="tool-input-client">
        {t(locale, "tool_client")}
      </label>
      <input
        id="tool-input-client"
        value={active?.clientName ?? ""}
        onChange={(event) => { patchActive({ clientName: event.target.value }); setZipUrl(null); }}
        className="ds-input w-full"
      />
    </div>
          </div>
  </>;
}
