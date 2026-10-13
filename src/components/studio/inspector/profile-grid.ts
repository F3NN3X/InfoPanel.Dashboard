import type { Placement, ProfileView } from "@/lib/layout";
import { changeCols, changeRows } from "../studio-actions";

/** The toast when a smaller grid would cut a zone off. */
export const GRID_REFUSED = "Some zones would fall outside the grid — move or resize them first";

/**
 * Step the grid's columns or rows by `delta` (limits as `changeCols` /
 * `changeRows`). Shrinking below a zone's far edge is refused (null)
 * instead of squeezing the zone; the same profile comes back when the
 * limit leaves nothing to change. The grid is shared by every page, so
 * `otherZones` (the other pages' zones) count for the refusal too.
 */
export function stepGrid(
  profile: ProfileView,
  axis: "cols" | "rows",
  delta: number,
  otherZones: readonly Placement[] = []
): ProfileView | null {
  const next = axis === "cols" ? changeCols(profile, delta) : changeRows(profile, delta);
  if (next[axis] === profile[axis]) return profile;
  if (next[axis] > profile[axis]) return next;
  const size = next[axis];
  const outside = [...profile.placements, ...otherZones].some((p) =>
    axis === "cols" ? p.colStart + p.colSpan - 1 > size : p.rowStart + p.rowSpan - 1 > size
  );
  return outside ? null : next;
}

/** The design sizes the Profile tab offers (README §4.7). */
export const SIZE_PRESETS: readonly { width: number; height: number }[] = [
  { width: 1920, height: 550 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 720 },
  { width: 1280, height: 400 },
  { width: 1024, height: 600 },
  { width: 800, height: 480 },
];

export const CUSTOM_SIZE = "custom";

const sizeKey = (width: number, height: number) => `${width}×${height}`;

/** The select value of a design size: its preset, else "custom". */
export function sizeChoice(width: number, height: number): string {
  return SIZE_PRESETS.some((p) => p.width === width && p.height === height) ? sizeKey(width, height) : CUSTOM_SIZE;
}

export const SIZE_OPTIONS = [
  ...SIZE_PRESETS.map((p) => ({ value: sizeKey(p.width, p.height), label: sizeKey(p.width, p.height) })),
  { value: CUSTOM_SIZE, label: "Custom" },
];

/** A preset's select value as a size (null for "custom"). */
export function sizeOfChoice(choice: string): { width: number; height: number } | null {
  return SIZE_PRESETS.find((p) => sizeKey(p.width, p.height) === choice) ?? null;
}

/** Typed design-size text as pixels: a positive whole number, else null (nothing is written). */
export function parseSize(text: string): number | null {
  const n = parseInt(text, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}
