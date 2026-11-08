// How the Stream Deck widget lays its keys out. Pure: the widget passes its inner size and the device's grid.

/** The page row's height, px. */
export const PAGE_ROW = 28;

/** A swipe has to travel this far across, px, and mostly sideways. */
export const SWIPE_PX = 48;

/** Where a swipe can turn pages, a key's press waits this long, ms, or for the pointer to lift. */
export const HOLD_MS = 120;

/** A pointer that travels further than this, px, before its press is sent is a swipe: the key is never pressed. */
export const SLOP_PX = 12;

export interface KeyFit {
  /** One key's side, px (square). */
  size: number;
  /** The whole grid's width and height, px. */
  width: number;
  height: number;
}

/** The biggest square keys that fit `cols` × `rows` (with `gap` between them) into `w` × `h`; 0 when nothing fits. */
export function fitKeys(w: number, h: number, cols: number, rows: number, gap: number): KeyFit {
  const size = Math.max(0, Math.floor(Math.min((w - (cols - 1) * gap) / cols, (h - (rows - 1) * gap) / rows)));
  return { size, width: size * cols + (cols - 1) * gap, height: size * rows + (rows - 1) * gap };
}

/** Keys smaller than this, px, are not touch targets: a big deck then shows a 3-column window of its keys at a time. */
export const MIN_TOUCH_KEY = 44;
/** The window's columns, and the most rows. */
export const WINDOW_COLS = 3;
export const WINDOW_ROWS = 3;
/** A window whose keys would still be smaller than this, px, is not worth it: the whole grid stays. */
export const WINDOW_MIN_KEY = 36;

export interface KeyWindow {
  /** Columns and rows the window holds (the last ones can be short). */
  cols: number;
  rows: number;
  /** The deck's key indexes in it, row by row. */
  indexes: number[];
}

/** The deck's `cols` × `rows` keys cut into windows of 3 × 3, left to right then down. */
export function keyWindows(cols: number, rows: number): KeyWindow[] {
  const out: KeyWindow[] = [];
  for (let r0 = 0; r0 < rows; r0 += WINDOW_ROWS)
    for (let c0 = 0; c0 < cols; c0 += WINDOW_COLS) {
      const wc = Math.min(WINDOW_COLS, cols - c0),
        wr = Math.min(WINDOW_ROWS, rows - r0);
      out.push({ cols: wc, rows: wr, indexes: Array.from({ length: wc * wr }, (_, i) => (r0 + Math.floor(i / wc)) * cols + c0 + (i % wc)) });
    }
  return out;
}

/** Which way a pointer's travel from down to up turns pages: 1 next (leftwards), -1 previous, 0 none. */
export function swipeOf(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 2) return 0;
  return dx < 0 ? 1 : -1;
}

/** The title's font size for a key of side `size` (S, M, L), px; 0 when the key is too small to carry one. */
export function titlePx(size: number, scale: "sm" | "md" | "lg"): number {
  if (size < 40) return 0;
  return Math.max(8, Math.round(size * { sm: 0.13, md: 0.17, lg: 0.22 }[scale]));
}

/** The page shown "n / N": counted from 1 and held within the total. */
export const pageText = (current: number, total: number): string => `${Math.min(total, current + 1)} / ${total}`;
