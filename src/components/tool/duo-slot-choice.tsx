"use client";

import { useI18n } from "@/components/i18n-provider";
import { duoPicks, DUO_SLOT_MAX, type DuoSelection } from "@/lib/duo-selection";

export function DuoSlotChoice({ value, outerFiles, innerFiles, onChange }: {
  value: DuoSelection; outerFiles: File[]; innerFiles: File[]; onChange: (value: DuoSelection) => void;
}) {
  const { t, tf } = useI18n();
  // A source removed from a draft must not leave a stale selected index.
  const picks = value.mode === "mix" ? (value.picks ?? []).filter((pick) => pick.index < (pick.side === "outer" ? outerFiles.length : innerFiles.length)) : [];
  const count = duoPicks({ ...value, picks }, outerFiles.length, innerFiles.length).length;
  return <fieldset className="mb-4" data-testid="duo-slot-choice">
    <legend className="ds-label">{t("tool_duo_content")}</legend>
    <select aria-label={t("tool_duo_content")} className="ds-input mt-2 w-full" value={value.mode}
      onChange={(event) => onChange({ mode: event.target.value as DuoSelection["mode"], picks: [] })}>
      <option value="outer">{t("tool_duo_outer_only")}</option>
      <option value="inner">{t("tool_duo_inner_only")}</option>
      <option value="mix">{t("tool_duo_mix")}</option>
    </select>
    {value.mode === "mix" ? <div className="mt-2 space-y-1">
      {(["outer", "inner"] as const).flatMap((side) => (side === "outer" ? outerFiles : innerFiles).map((file, index) => {
        const checked = picks.some((pick) => pick.side === side && pick.index === index);
        return <label key={`${side}-${index}`} className="flex gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={() => onChange({ mode: "mix", picks: checked ? picks.filter((pick) => pick.side !== side || pick.index !== index) : [...picks, { side, index }] })} />
          {t(side === "outer" ? "tool_closed" : "tool_open")} {index + 1} · {file.name}
        </label>;
      }))}
    </div> : null}
    <p className="mt-2 text-sm" role={count > DUO_SLOT_MAX ? "alert" : "status"} data-testid="duo-slot-count">
      {tf(count > DUO_SLOT_MAX ? "tool_duo_over_limit" : "tool_duo_count", { n: count })}
    </p>
    <p className="mt-2 text-xs text-[var(--muted)]">{t("tool_duo_slot_hint")}</p>
  </fieldset>;
}
