/*
 * The zone selection as an ordered list of ids: the last one is the
 * primary zone (its toolbar, handles and inspector).
 */

/**
 * How a click changes the selection: `only` selects just that zone,
 * `toggle` (Shift / Ctrl / ⌘) adds or removes it, `primary` (a press on a
 * zone, before a possible drag) makes a selected zone the primary one and
 * keeps the rest, or selects an unselected zone alone.
 */
export type SelectMode = "only" | "toggle" | "primary";

export function nextSelection(ids: readonly string[], id: string, mode: SelectMode): string[] {
  const has = ids.includes(id);
  const others = ids.filter((x) => x !== id);
  if (mode === "toggle") return has ? others : [...ids, id];
  if (mode === "primary" && has) return [...others, id];
  return [id];
}

/** Whether a click adds to or removes from the selection. */
export function isToggleClick(e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.shiftKey || e.ctrlKey || e.metaKey;
}
