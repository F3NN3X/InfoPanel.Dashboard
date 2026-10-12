import type { MonitorProfile } from "@/lib/layout";
import { changeCols, changeRows } from "../studio-actions";

/** The toast when a smaller grid would cut a zone off. */
export const GRID_REFUSED = "Some zones would fall outside the grid — move or resize them first";

/**
 * Step the grid's columns or rows by `delta` (limits as `changeCols` /
 * `changeRows`). Shrinking below a zone's far edge is refused (null)
 * instead of squeezing the zone; the same profile comes back when the
 * limit leaves nothing to change.
 */
export function stepGrid(profile: MonitorProfile, axis: "cols" | "rows", delta: number): MonitorProfile | null {
  const next = axis === "cols" ? changeCols(profile, delta) : changeRows(profile, delta);
  if (next[axis] === profile[axis]) return profile;
  if (next[axis] > profile[axis]) return next;
  const size = next[axis];
  const outside = profile.placements.some((p) =>
    axis === "cols" ? p.colStart + p.colSpan - 1 > size : p.rowStart + p.rowSpan - 1 > size
  );
  return outside ? null : next;
}
