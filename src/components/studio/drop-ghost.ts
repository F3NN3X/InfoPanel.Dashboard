import { BLANK_MODULE, type Placement } from "@/lib/layout";
import { DND_MIME, DND_MIME_PANEL, ALL_MODULES } from "./studio-modules";
import { zoneFits, type ZoneRect } from "./zone-geometry";

type Size = { cols: number; rows: number };

/** A widget or panel preset from the Add library (dragged, or clicked). */
export interface LibraryItem {
  kind: "module" | "panel";
  id: string;
}

/**
 * What a library drag carries, read from its data (null = not ours, or an
 * unknown widget). Only readable in `dragstart` and `drop`, not `dragover`.
 */
export function libraryItemOf(getData: (type: string) => string): LibraryItem | null {
  const module = getData(DND_MIME);
  if (module && (module === BLANK_MODULE || ALL_MODULES.some((m) => m.id === module))) return { kind: "module", id: module };
  const panel = getData(DND_MIME_PANEL);
  return panel ? { kind: "panel", id: panel } : null;
}

/** A widget's footprint when dropped: at least 3×2, its minimum if larger, kept inside the grid. */
export function dropSize(min: Size, grid: { cols: number; rows: number }): Size {
  return {
    cols: Math.min(grid.cols, Math.max(min.cols, 3)),
    rows: Math.min(grid.rows, Math.max(min.rows, 2)),
  };
}

/**
 * What a widget drops with: its declared default size (never below its minimum), else 3×2 or the
 * minimum; kept inside the grid.
 */
export function moduleDropSize(module: string, grid: { cols: number; rows: number }): Size {
  const meta = ALL_MODULES.find((m) => m.id === module);
  const min = { cols: meta?.minCols ?? 2, rows: meta?.minRows ?? 1 };
  return meta?.defaultSize ? defaultDropSize(meta.defaultSize, min, grid) : dropSize(min, grid);
}

/** A declared default size (cols, rows), at least the minimum, kept inside the grid. */
export function defaultDropSize(def: [number, number], min: Size, grid: { cols: number; rows: number }): Size {
  return { cols: Math.min(grid.cols, Math.max(def[0], min.cols)), rows: Math.min(grid.rows, Math.max(def[1], min.rows)) };
}

/**
 * The drop ghost for a pointer over `cell`: the box centred on the cell,
 * clamped into the grid, and whether it is free of other visible zones.
 */
export function dropGhost(
  cell: { col: number; row: number },
  size: Size,
  grid: { cols: number; rows: number },
  placements: Placement[]
): { rect: ZoneRect; ok: boolean } {
  const clamp = (n: number, max: number) => Math.max(1, Math.min(max, n));
  const rect: ZoneRect = {
    col: clamp(cell.col - Math.floor((size.cols - 1) / 2), grid.cols + 1 - size.cols),
    row: clamp(cell.row - Math.floor((size.rows - 1) / 2), grid.rows + 1 - size.rows),
    cols: size.cols,
    rows: size.rows,
  };
  return { rect, ok: zoneFits(rect, placements, grid.cols, grid.rows) };
}
