/** One APP_IPHONE_DUO slot per listing locale, shared by both screen sizes. */
export const DUO_SLOT_MAX = 10;
export type DuoPick = { side: "outer" | "inner"; index: number };
export type DuoSelection = { mode: "outer" | "inner" | "mix"; picks?: DuoPick[] };

/** Source indices are retained for cropping and ZIP filenames. Never silently trim. */
export function duoPicks(selection: DuoSelection | undefined, outer: number, inner: number): DuoPick[] {
  if (selection && !["outer", "inner", "mix"].includes(selection.mode)) throw new Error("INVALID_DUO_SELECTION");
  const mode = selection?.mode ?? "outer";
  if (mode === "outer" || mode === "inner") {
    return Array.from({ length: mode === "outer" ? outer : inner }, (_, index) => ({ side: mode, index }));
  }
  if (mode !== "mix" || !Array.isArray(selection?.picks)) throw new Error("INVALID_DUO_SELECTION");
  const seen = new Set<string>();
  return selection.picks.map((pick) => {
    if (!pick || !["outer", "inner"].includes(pick.side) || !Number.isInteger(pick.index) || pick.index < 0 || pick.index >= (pick.side === "outer" ? outer : inner)) throw new Error("INVALID_DUO_SELECTION");
    const key = `${pick.side}:${pick.index}`;
    if (seen.has(key)) throw new Error("INVALID_DUO_SELECTION");
    seen.add(key);
    return { side: pick.side, index: pick.index };
  });
}

export function validateDuoSelection(selection: DuoSelection | undefined, outer: number, inner: number): DuoPick[] {
  const picks = duoPicks(selection, outer, inner);
  if (picks.length > DUO_SLOT_MAX) throw new Error("DUO_SLOT_LIMIT");
  if (!picks.length) throw new Error("DUO_SELECTION_EMPTY");
  return picks;
}
