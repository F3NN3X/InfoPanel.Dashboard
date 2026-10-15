/**
 * The Dynamic Island: a per-profile pill at the top centre of the page that shows the time and
 * springs open for alerts (`MonitorProfile.island`). Absent = no island, so stored configs load
 * unchanged without a migration. See docs/redesign/island/PLAN.md.
 */

/** "sensor": the time and one live value (`sensorKey`). */
export type IslandIdle = "time" | "time-date" | "sensor" | "hidden";
export const ISLAND_IDLES: readonly IslandIdle[] = ["time", "time-date", "sensor", "hidden"];
export type IslandSize = "s" | "m" | "l";
export const ISLAND_SIZES: readonly IslandSize[] = ["s", "m", "l"];
/** "theme": the theme's card colour and text instead of black. */
export type IslandTint = "black" | "theme";
export const ISLAND_TINTS: readonly IslandTint[] = ["black", "theme"];

export interface IslandConfig {
  enabled: boolean;
  /** What the pill shows with nothing to report ("hidden": only alerts show). */
  idle: IslandIdle;
  /** The value idle "sensor" shows ("" = none picked yet), and a short label before it. */
  sensorKey: string;
  sensorLabel: string;
  size: IslandSize;
  /** Distance from the top of the page, px. */
  offsetY: number;
  /**
   * Seconds an alert that stays until acknowledged keeps the island open, for screens without
   * touch; after it the alert stays as a badge until it clears. 0 = open until tapped.
   */
  collapseAfter: number;
  /** Push the zones down by the pill's height instead of overlaying the top row. */
  reserve: boolean;
  tint: IslandTint;
}

export const ISLAND_DEFAULTS: IslandConfig = {
  enabled: true,
  idle: "time",
  sensorKey: "",
  sensorLabel: "",
  size: "m",
  offsetY: 8,
  collapseAfter: 0,
  reserve: false,
  tint: "black",
};
/** The label before the sensor value stays short: it shares the pill with the time. */
export const ISLAND_LABEL_MAX = 12;
export const ISLAND_OFFSET_MAX = 64;
export const ISLAND_COLLAPSE_MAX = 600;

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined;
const clamp = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : fallback;

/** Tolerant read of a stored `island`: bad enums fall back to the defaults, numbers are clamped. */
export function normalizeIsland(raw: unknown): IslandConfig | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  return {
    enabled: r.enabled !== false,
    idle: oneOf(ISLAND_IDLES, r.idle) ?? ISLAND_DEFAULTS.idle,
    sensorKey: typeof r.sensorKey === "string" ? r.sensorKey.trim() : "",
    sensorLabel: typeof r.sensorLabel === "string" ? r.sensorLabel.slice(0, ISLAND_LABEL_MAX) : "",
    size: oneOf(ISLAND_SIZES, r.size) ?? ISLAND_DEFAULTS.size,
    offsetY: clamp(r.offsetY, 0, ISLAND_OFFSET_MAX, ISLAND_DEFAULTS.offsetY),
    collapseAfter: clamp(r.collapseAfter, 0, ISLAND_COLLAPSE_MAX, ISLAND_DEFAULTS.collapseAfter),
    reserve: r.reserve === true,
    tint: oneOf(ISLAND_TINTS, r.tint) ?? ISLAND_DEFAULTS.tint,
  };
}

/** The island with `patch` applied; a profile without one starts from the defaults (switched off). */
export function withIsland<P extends { island?: IslandConfig }>(profile: P, patch: Partial<IslandConfig>): P {
  return { ...profile, island: { ...ISLAND_DEFAULTS, enabled: false, ...profile.island, ...patch } };
}
