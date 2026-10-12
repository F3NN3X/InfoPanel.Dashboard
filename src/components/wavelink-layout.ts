/**
 * Which layout the Wave Link widget uses for a zone (see ModernWaveLink):
 *
 * - `card`     — stacked channel rows (tall zones, and zones too narrow
 *                for the mixer columns)
 * - `standard` — mixer columns side by side, with the device column
 * - `compact`  — one line: name · fader % · bar (short zones)
 * - `simple`   — the first channel only (picked by the user)
 */
export type WaveLinkVariant = "card" | "standard" | "compact" | "simple";

/** Narrowest mixer column that keeps its name, fader % and mix chips apart. */
const MIN_COLUMN_W = 96;
/** The standard layout's column gap, device column (w-52 + gap) and padding. */
const COLUMN_GAP = 12;
const DEVICE_COLUMN_W = 208 + COLUMN_GAP;
const PADDING_X = 32;
/** The standard layout shows at most this many columns. */
export const MAX_COLUMNS = 6;
/** Below this height stacked rows don't fit either: the one-line layout. */
const MIN_CARD_H = 180;

/** The width the standard layout needs for `channels` columns (and the devices). */
export function standardWidth(channels: number, devices: boolean): number {
  const n = Math.max(1, Math.min(MAX_COLUMNS, channels));
  return n * MIN_COLUMN_W + (n - 1) * COLUMN_GAP + (devices ? DEVICE_COLUMN_W : 0) + PADDING_X;
}

/**
 * The layout for a measured zone (unzoomed px). Mixer columns only where
 * they fit side by side — squeezed, their names and chips run into each
 * other — else stacked rows, else one line.
 */
export function pickWaveLinkVariant(
  w: number,
  h: number,
  forced: WaveLinkVariant | "auto",
  content: { channels: number; devices: boolean }
): WaveLinkVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w <= 340 && h >= MIN_CARD_H) return "card";
  if (w >= standardWidth(content.channels, content.devices)) return "standard";
  return h >= MIN_CARD_H ? "card" : "compact";
}
