/**
 * Grid spacing of a monitor profile — the gap between zones and the
 * padding around the grid — and the track math that depends on it. The
 * kiosk grid (App.tsx), the studio canvas (rulers, guides, drawing,
 * move / resize pitch) and `PlacementFrame` all read the gap from here,
 * so a profile's gap moves every one of them together.
 */

/** Gap between zones when a profile sets none (Tailwind gap-3). */
export const DEFAULT_GRID_GAP = 12;
/** The space a kiosk page leaves around its grid when the screen sets no padding and does not touch the edges (px). */
export const KIOSK_EDGE_INSET = 8;
/** Upper bound for the gap / padding inputs (px). */
export const MAX_SPACING = 200;

/** "inset": the kiosk page keeps `KIOSK_EDGE_INSET` off the display edge (unset is the same); "touch": the grid reaches the edge. */
export type ScreenEdges = "inset" | "touch";
export const SCREEN_EDGES: readonly ScreenEdges[] = ["inset", "touch"];

interface Spacing {
  fit: "scroll" | "fill";
  gap?: number;
  padding?: number;
  edges?: ScreenEdges;
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
 * defaults: a "fill" kiosk page keeps a small inset off the display edge
 * (0 when the screen's `edges` is "touch"), a "fill" page with the header
 * 12, a "scroll" page 24.
 */
export function profilePadding(profile: Spacing, kiosk: boolean): number {
  if (profile.padding !== undefined) return profile.padding;
  if (profile.fit === "fill") return kiosk ? (profile.edges === "touch" ? 0 : KIOSK_EDGE_INSET) : 12;
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

/** The Status Bar row's height on a tall kiosk page: a share of the window height, within these bounds (px). */
export const BAR_ROW_SHARE = 0.08;
export const BAR_ROW_MIN = 56;
export const BAR_ROW_MAX = 96;

interface BarZone {
  module: string;
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
  visible: boolean;
}

/**
 * The kiosk grid's rows when the page is the default layout, a full-width Status Bar alone in the first row: the bar
 * keeps `clamp(56px, 8vh, 96px)` and the other rows share the rest, so a tall screen gives its height to the panels.
 * Undefined (rows shared evenly) for any other page, and when the even row is no taller than the bar's share.
 */
export function barRowTemplate(
  profile: Pick<Spacing, "fit" | "gap"> & { cols: number; rows: number },
  zones: readonly BarZone[],
  /** The room the rows share: the window's height less the padding and the island's reserve, px. */
  room: number,
  windowHeight: number
): string | undefined {
  if (profile.fit !== "fill" || profile.rows < 3) return undefined;
  const inFirstRow = zones.filter((z) => z.visible && z.rowStart === 1);
  const bar = inFirstRow.length > 0 && inFirstRow.every((z) => z.module === "StatusBar" && z.rowSpan === 1);
  if (!bar || !inFirstRow.some((z) => z.colStart === 1 && z.colSpan === profile.cols)) return undefined;
  const cap = Math.min(BAR_ROW_MAX, Math.max(BAR_ROW_MIN, windowHeight * BAR_ROW_SHARE));
  if (trackSize(room, profile.rows, profileGap(profile)) <= cap) return undefined;
  return `clamp(${BAR_ROW_MIN}px, ${BAR_ROW_SHARE * 100}vh, ${BAR_ROW_MAX}px) repeat(${profile.rows - 1}, minmax(0, 1fr))`;
}
