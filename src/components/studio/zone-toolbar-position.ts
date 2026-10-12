/** A box in px, relative to the canvas viewport's top-left corner. */
export interface ViewBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ToolbarPosition {
  left: number;
  top: number;
  /** Where it sits relative to the zone. */
  side: "above" | "below" | "inside";
}

/** Space between the zone and its chip, and the viewport inset. */
const GAP = 7;
const INSET = 4;

/**
 * Where the selected zone's toolbar goes: above the zone, below it when
 * there is no room above, else pinned inside the visible part of the zone
 * (a zone taller than the viewport). Left-aligned with the zone, kept
 * inside the viewport. Null when the zone is scrolled out of view.
 */
export function toolbarPosition(
  zone: ViewBox,
  view: { width: number; height: number },
  toolbar: { width: number; height: number }
): ToolbarPosition | null {
  const bottom = zone.top + zone.height;
  const right = zone.left + zone.width;
  if (bottom < 0 || zone.top > view.height || right < 0 || zone.left > view.width) return null;

  const left = Math.max(INSET, Math.min(zone.left, view.width - toolbar.width - INSET));
  const above = zone.top - GAP - toolbar.height;
  if (above >= INSET) return { left, top: above, side: "above" };
  const below = bottom + GAP;
  if (below + toolbar.height <= view.height - INSET) return { left, top: below, side: "below" };
  return { left, top: Math.max(INSET, zone.top + GAP), side: "inside" };
}
