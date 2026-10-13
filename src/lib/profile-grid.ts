/**
 * Grid spacing of a monitor profile — the gap between zones and the
 * padding around the grid — and the track math that depends on it. The
 * kiosk grid (App.tsx), the studio canvas (rulers, guides, drawing,
 * move / resize pitch) and `PlacementFrame` all read the gap from here,
 * so a profile's gap moves every one of them together.
 */

/** Gap between zones when a profile sets none (Tailwind gap-3). */
export const DEFAULT_GRID_GAP = 12;
/** Upper bound for the gap / padding inputs (px). */
export const MAX_SPACING = 200;

interface Spacing {
  fit: "scroll" | "fill";
  gap?: number;
  padding?: number;
}

/** A stored gap / padding: a whole number of px in 0..MAX_SPACING, else unset. */
export function normalizeSpacing(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.max(0, Math.min(MAX_SPACING, Math.round(v)));
}

/** The profile's gap between zones (px). */
export function profileGap(profile: Spacing): number {
  return profile.gap ?? DEFAULT_GRID_GAP;
}

/**
 * The padding around the profile's grid (px). Unset keeps the page's
 * defaults: a "fill" kiosk page uses the whole window (0), a "fill" page
 * with the header 12, a "scroll" page 24.
 */
export function profilePadding(profile: Spacing, kiosk: boolean): number {
  if (profile.padding !== undefined) return profile.padding;
  if (profile.fit === "fill") return kiosk ? 0 : 12;
  return 24;
}

/** The size of one track: `count` tracks and their gaps share `length`. */
export function trackSize(length: number, count: number, gap: number): number {
  return count > 0 ? (length - (count - 1) * gap) / count : 0;
}

/** Track + gap: the distance from one track's start to the next. */
export function trackPitch(length: number, count: number, gap: number): number {
  return count > 0 ? (length + gap) / count : 0;
}

/** The x of each column boundary, in the middle of its gap. */
export function columnGuides(width: number, cols: number, gap: number): number[] {
  const size = trackSize(width, cols, gap);
  if (size <= 0) return [];
  return Array.from({ length: cols - 1 }, (_, i) => (i + 1) * (size + gap) - gap / 2);
}

/** A box on the grid, in the same units as the inputs. */
export interface GridBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The 1-based cell under a point (grid-local), or null outside the grid. */
export function cellAt(
  x: number,
  y: number,
  grid: { width: number; height: number },
  cols: number,
  rows: number,
  gap: number
): { col: number; row: number } | null {
  if (grid.width <= 0 || grid.height <= 0) return null;
  const col = Math.floor(x / trackPitch(grid.width, cols, gap)) + 1;
  const row = Math.floor(y / trackPitch(grid.height, rows, gap)) + 1;
  if (col < 1 || col > cols || row < 1 || row > rows) return null;
  return { col, row };
}

/** The grid-local box of a zone rect from its track sizes. */
export function zoneBox(
  r: { col: number; row: number; cols: number; rows: number },
  track: { width: number; height: number },
  gap: number
): GridBox {
  return {
    left: (r.col - 1) * (track.width + gap),
    top: (r.row - 1) * (track.height + gap),
    width: r.cols * track.width + (r.cols - 1) * gap,
    height: r.rows * track.height + (r.rows - 1) * gap,
  };
}
