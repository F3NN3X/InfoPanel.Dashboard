import type { IslandConfig, IslandIdle, IslandSize } from "@/lib/island/config";
import type { IslandSnapshot } from "@/lib/island/types";

/**
 * What the island is showing: open for a notice, the time with a badge, the time with a live
 * activity, the time alone, or nothing.
 */
export type IslandMode = "expanded" | "compact" | "activity" | "idle" | "none";

export function islandMode(snap: IslandSnapshot, idle: IslandIdle): IslandMode {
  if (snap.expanded) return "expanded";
  if (snap.pending.length > 0) return "compact";
  if (snap.activity) return "activity";
  return idle === "hidden" ? "none" : "idle";
}

interface Box {
  width: number;
  height: number;
}

const IDLE: Record<IslandSize, Box> = { s: { width: 124, height: 28 }, m: { width: 156, height: 36 }, l: { width: 196, height: 46 } };
/** Extra width for the date or the sensor value beside the time. */
const DATE_EXTRA: Record<IslandSize, number> = { s: 96, m: 120, l: 150 };
/** Extra width for the badge beside the time. */
const BADGE_EXTRA: Record<IslandSize, number> = { s: 36, m: 44, l: 54 };
const EXPANDED: Record<IslandSize, Box> = { s: { width: 300, height: 64 }, m: { width: 380, height: 78 }, l: { width: 470, height: 96 } };
export const ISLAND_FONT_PX: Record<IslandSize, number> = { s: 12, m: 14, l: 17 };
const SIZES_DOWN: readonly IslandSize[] = ["l", "m", "s"];
/** The open island takes at most this share of the page height. */
export const EXPANDED_MAX_SHARE = 0.4;
/** Space kept between the pill and the page edges, px. */
const SIDE_ROOM = 16;

/**
 * The pill's box per mode. Fixed sizes so width, height and radius can animate between modes; the
 * view caps the width to the page.
 */
export function islandBox(mode: IslandMode, size: IslandSize, idle: IslandIdle): Box {
  if (mode === "expanded") return EXPANDED[size];
  const base = IDLE[size];
  const extra = idle === "time-date" || idle === "sensor" ? DATE_EXTRA[size] : 0;
  if (mode === "compact") return { width: base.width + extra + BADGE_EXTRA[size], height: base.height };
  if (mode === "activity") return { width: EXPANDED[size].width, height: base.height };
  if (mode === "idle") return { width: base.width + extra, height: base.height };
  return { width: 0, height: 0 };
}

/**
 * The size that fits the page: the chosen one, or the largest smaller one whose open island stays
 * within `EXPANDED_MAX_SHARE` of the height and inside the width (a short strip or a small screen).
 * The smallest size is the floor.
 */
export function fitIslandSize(size: IslandSize, page: { width: number; height: number }): IslandSize {
  if (!(page.width > 0 && page.height > 0)) return size;
  const fits = (s: IslandSize) =>
    EXPANDED[s].height <= page.height * EXPANDED_MAX_SHARE && EXPANDED[s].width + SIDE_ROOM <= page.width;
  return SIZES_DOWN.slice(SIZES_DOWN.indexOf(size)).find(fits) ?? "s";
}

/** The top space "Reserve space" keeps free for the pill: its offset, its idle height and a gap, px. */
export function islandReserve(island: IslandConfig | undefined, page: { width: number; height: number }): number {
  if (!island?.enabled || !island.reserve) return 0;
  return island.offsetY + IDLE[fitIslandSize(island.size, page)].height + 8;
}
