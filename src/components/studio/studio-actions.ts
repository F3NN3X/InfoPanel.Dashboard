import {
  BLANK_MODULE,
  CARDS_ID,
  PANEL_ID,
  clonePlacement,
  type MonitorProfile,
  type Placement,
} from "@/lib/layout";
import { normalizePanelPlacement } from "@/lib/panel-model";
import { modules } from "@/modules";
import { PROFILE_STYLE_KEYS, CARD_SETTINGS, PANEL_SETTINGS, replaceStyle } from "@/modules/standard-settings";
import { settingKeys } from "@/modules/types";
import type { PanelPreset } from "@/lib/panelPresets";
import type { ModuleSettings } from "@/modules/types";
import { ALL_MODULES } from "./studio-modules";
import { dropKeys } from "./settings-model";
import { firstFreeRect, zoneFits, type ZoneRect } from "./zone-geometry";

/*
 * Pure profile mutations behind the studio's controls. Each takes the
 * profile and returns a new one; the studio applies them through its
 * profile updater. Ids are passed in so the caller can select the result.
 */

type Size = { cols: number; rows: number };

/** Apply `fn` to one placement. */
export function updatePlacement(
  profile: MonitorProfile,
  id: string,
  fn: (p: Placement) => Placement
): MonitorProfile {
  return {
    ...profile,
    placements: profile.placements.map((x) => (x.id === id ? fn(x) : x)),
  };
}

/** Append a placement at the first free slot of `size` (top-left if full). */
function appendAtFreeSlot(
  profile: MonitorProfile,
  size: Size,
  make: (pos: ZoneRect) => Placement
): MonitorProfile {
  const clamped = {
    cols: Math.max(1, Math.min(size.cols, profile.cols)),
    rows: Math.max(1, Math.min(size.rows, profile.rows)),
  };
  const pos =
    firstFreeRect(profile.cols, profile.rows, clamped, profile.placements) ?? {
      col: 1,
      row: 1,
      cols: clamped.cols,
      rows: clamped.rows,
    };
  return { ...profile, placements: [...profile.placements, make(pos)] };
}

function zoneAt(id: string, module: string, rect: ZoneRect): Placement {
  return {
    id,
    module,
    colStart: rect.col,
    rowStart: rect.row,
    colSpan: rect.cols,
    rowSpan: rect.rows,
    visible: true,
  };
}

/** Add a module widget at its minimum size in the first free slot. */
export function addModulePlacement(
  profile: MonitorProfile,
  id: string,
  module: string,
  minSize: Size
): MonitorProfile {
  return appendAtFreeSlot(profile, minSize, (pos) => zoneAt(id, module, pos));
}

/**
 * A zone holding a fresh panel from the preset, migrated like a loaded
 * one: normalized, with its look in the settings (title → label, …).
 * A saved preset brings its own settings.
 */
function withPreset(p: Placement, preset: PanelPreset): Placement {
  return normalizePanelPlacement({
    ...p,
    module: PANEL_ID,
    panel: preset.make(),
    settings: preset.settings ? { ...preset.settings } : undefined,
  });
}

/** Add a pre-designed panel (a group of widgets) from a preset. */
export function addPresetPlacement(
  profile: MonitorProfile,
  id: string,
  preset: PanelPreset
): MonitorProfile {
  return appendAtFreeSlot(
    profile,
    { cols: preset.colSpan, rows: preset.rowSpan },
    (pos) => withPreset(zoneAt(id, PANEL_ID, pos), preset)
  );
}

/** Add a module widget in an explicit box (a library drop; the caller checked it fits). */
export function addModuleAt(
  profile: MonitorProfile,
  id: string,
  module: string,
  rect: ZoneRect
): MonitorProfile {
  return { ...profile, placements: [...profile.placements, zoneAt(id, module, rect)] };
}

/** Add a panel preset in an explicit box (a library drop; the caller checked it fits). */
export function addPresetAt(
  profile: MonitorProfile,
  id: string,
  preset: PanelPreset,
  rect: ZoneRect
): MonitorProfile {
  return {
    ...profile,
    placements: [...profile.placements, withPreset(zoneAt(id, PANEL_ID, rect), preset)],
  };
}

/** Add a blank zone with an explicit (already clamped) box. */
export function addBlankZone(
  profile: MonitorProfile,
  id: string,
  rect: ZoneRect
): MonitorProfile {
  return {
    ...profile,
    placements: [...profile.placements, zoneAt(id, BLANK_MODULE, rect)],
  };
}

/** Set a zone's box (the caller clamps it first). */
export function setZoneRect(
  profile: MonitorProfile,
  id: string,
  rect: ZoneRect
): MonitorProfile {
  return updatePlacement(profile, id, (p) => ({
    ...p,
    colStart: rect.col,
    rowStart: rect.row,
    colSpan: rect.cols,
    rowSpan: rect.rows,
  }));
}

export function setSpan(
  profile: MonitorProfile,
  id: string,
  span: number
): MonitorProfile {
  return updatePlacement(profile, id, (x) => ({ ...x, colSpan: span }));
}

export function setRowSpan(
  profile: MonitorProfile,
  id: string,
  span: number
): MonitorProfile {
  return updatePlacement(profile, id, (x) => ({ ...x, rowSpan: span }));
}

export function toggleVisible(
  profile: MonitorProfile,
  id: string
): MonitorProfile {
  return updatePlacement(profile, id, (x) => ({ ...x, visible: !x.visible }));
}

export function removePlacement(
  profile: MonitorProfile,
  id: string
): MonitorProfile {
  return {
    ...profile,
    placements: profile.placements.filter((x) => x.id !== id),
  };
}

/** Insert a copy (new id) right after the original. */
export function duplicatePlacement(
  profile: MonitorProfile,
  id: string
): MonitorProfile {
  const i = profile.placements.findIndex((x) => x.id === id);
  if (i === -1) return profile;
  const next = [...profile.placements];
  next.splice(i + 1, 0, clonePlacement(profile.placements[i]));
  return { ...profile, placements: next };
}

/** Set several zones' boxes at once (the caller checks them first). */
export function setZoneRects(
  profile: MonitorProfile,
  rects: Record<string, ZoneRect>
): MonitorProfile {
  return {
    ...profile,
    placements: profile.placements.map((p) => {
      const r = rects[p.id];
      return r ? { ...p, colStart: r.col, rowStart: r.row, colSpan: r.cols, rowSpan: r.rows } : p;
    }),
  };
}

export function removeZones(
  profile: MonitorProfile,
  ids: readonly string[]
): MonitorProfile {
  const set = new Set(ids);
  return { ...profile, placements: profile.placements.filter((x) => !set.has(x.id)) };
}

/** Hide every zone of the set while any of them shows; else show them all. */
export function toggleZonesVisible(
  profile: MonitorProfile,
  ids: readonly string[]
): MonitorProfile {
  const set = new Set(ids);
  const anyVisible = profile.placements.some((x) => set.has(x.id) && x.visible);
  return {
    ...profile,
    placements: profile.placements.map((x) => (set.has(x.id) ? { ...x, visible: !anyVisible } : x)),
  };
}

/**
 * Copy each zone (new ids) to the first free spot of its size, rows
 * first; earlier copies count as taken. A zone with no free spot is not
 * copied. `copies` are the new ids, for selecting them.
 */
export function duplicateZones(
  profile: MonitorProfile,
  ids: readonly string[]
): { profile: MonitorProfile; copies: string[] } {
  let placements = profile.placements;
  const copies: string[] = [];
  for (const id of ids) {
    const p = profile.placements.find((x) => x.id === id);
    if (!p) continue;
    const pos = firstFreeRect(profile.cols, profile.rows, { cols: p.colSpan, rows: p.rowSpan }, placements);
    if (!pos) continue;
    const copy = { ...clonePlacement(p), colStart: pos.col, rowStart: pos.row };
    placements = [...placements, copy];
    copies.push(copy.id);
  }
  return { profile: copies.length > 0 ? { ...profile, placements } : profile, copies };
}

/** A zone's minimum size: its widget's; blank zones and panels 1×1. */
export function zoneMinSize(p: Placement): Size {
  const meta = ALL_MODULES.find((m) => m.id === p.module);
  return meta ? { cols: meta.minCols, rows: meta.minRows } : { cols: 1, rows: 1 };
}

/** Make a zone blank: drop its widget, panel and settings. */
export function clearWidget(
  profile: MonitorProfile,
  id: string
): MonitorProfile {
  return updatePlacement(profile, id, (p) => ({
    ...p,
    module: BLANK_MODULE,
    panel: undefined,
    settings: undefined,
  }));
}

/** The zone's box grown to at least `min` cells, kept inside the grid. */
function grownRect(profile: MonitorProfile, p: Placement, min: Size): ZoneRect {
  const cols = Math.min(Math.max(p.colSpan, min.cols), profile.cols);
  const rows = Math.min(Math.max(p.rowSpan, min.rows), profile.rows);
  return {
    col: Math.min(p.colStart, profile.cols - cols + 1),
    row: Math.min(p.rowStart, profile.rows - rows + 1),
    cols,
    rows,
  };
}

/** Whether the zone can grow to at least `min` cells without covering another zone. */
export function canGrowTo(profile: MonitorProfile, id: string, min: Size): boolean {
  const p = profile.placements.find((x) => x.id === id);
  return (
    p !== undefined &&
    zoneFits(grownRect(profile, p, min), profile.placements, profile.cols, profile.rows, id)
  );
}

/**
 * Grow a zone to at least `min` cells, kept inside the grid. When the
 * grown box would cover another zone, the zone keeps its current box.
 */
function growTo(profile: MonitorProfile, p: Placement, min: Size) {
  const grown = grownRect(profile, p, min);
  const r = zoneFits(grown, profile.placements, profile.cols, profile.rows, p.id)
    ? grown
    : { col: p.colStart, row: p.rowStart, cols: p.colSpan, rows: p.rowSpan };
  return { colStart: r.col, rowStart: r.row, colSpan: r.cols, rowSpan: r.rows };
}

/** Assign a module to a zone, growing it to the module's minimum size. */
export function assignModule(
  profile: MonitorProfile,
  id: string,
  module: string,
  minSize: Size
): MonitorProfile {
  return updatePlacement(profile, id, (p) => ({
    ...p,
    module,
    panel: undefined,
    settings: undefined,
    ...growTo(profile, p, minSize),
  }));
}

/** Assign a preset panel to a zone, growing it to the preset's size. */
export function assignPreset(
  profile: MonitorProfile,
  id: string,
  preset: PanelPreset
): MonitorProfile {
  return updatePlacement(profile, id, (p) =>
    withPreset({ ...p, ...growTo(profile, p, { cols: preset.colSpan, rows: preset.rowSpan }) }, preset)
  );
}

/** Change the column count (2–24), keeping every zone inside the grid. */
export function changeCols(
  profile: MonitorProfile,
  delta: number
): MonitorProfile {
  const cols = Math.max(2, Math.min(24, profile.cols + delta));
  return {
    ...profile,
    cols,
    placements: profile.placements.map((pl) => {
      const colStart = Math.min(pl.colStart, cols);
      const colSpan = Math.max(1, Math.min(pl.colSpan, cols - colStart + 1));
      return { ...pl, colStart, colSpan };
    }),
  };
}

/** Change the row count (1–24), keeping every zone inside the grid. */
export function changeRows(
  profile: MonitorProfile,
  delta: number
): MonitorProfile {
  const rows = Math.max(1, Math.min(24, profile.rows + delta));
  return {
    ...profile,
    rows,
    placements: profile.placements.map((pl) => {
      const rowStart = Math.min(pl.rowStart, rows);
      const rowSpan = Math.max(1, Math.min(pl.rowSpan, rows - rowStart + 1));
      return { ...pl, rowStart, rowSpan };
    }),
  };
}

/** Update the profile style; an empty style is stored as undefined. */
export function setProfileStyle(
  profile: MonitorProfile,
  fn: (style: ModuleSettings) => ModuleSettings
): MonitorProfile {
  const style = fn(profile.style ?? {});
  return { ...profile, style: Object.keys(style).length > 0 ? style : undefined };
}

/** The look keys a zone's widget (or panel) has settings for. */
export function zoneStyleKeys(p: Placement): ReadonlySet<string> {
  const defs = p.panel
    ? PANEL_SETTINGS
    : p.module === CARDS_ID
      ? CARD_SETTINGS
      : (modules.find((m) => m.id === p.module)?.settings ?? []);
  return new Set(defs.flatMap(settingKeys));
}

/**
 * Give each zone of the set the copied style (see `replaceStyle`); a zone
 * that followed the global style switches to custom so it shows. Blank
 * zones have no look and are skipped.
 */
export function pasteStyleToZones(
  profile: MonitorProfile,
  ids: readonly string[],
  style: ModuleSettings
): MonitorProfile {
  const set = new Set(ids);
  return {
    ...profile,
    placements: profile.placements.map((p) =>
      set.has(p.id) && p.module !== BLANK_MODULE
        ? {
            ...p,
            settings: replaceStyle(p.settings, style, zoneStyleKeys(p)),
            styleMode: p.styleMode === "follow" ? "custom" : p.styleMode,
          }
        : p
    ),
  };
}

/** The zones follow the global style, and their own look overrides are cleared. */
export function followGlobalStyle(profile: MonitorProfile, ids: readonly string[]): MonitorProfile {
  const set = new Set(ids);
  return {
    ...profile,
    placements: profile.placements.map((p) =>
      set.has(p.id) ? { ...p, styleMode: "follow", settings: dropKeys(p.settings, PROFILE_STYLE_KEYS) } : p
    ),
  };
}

/**
 * The profile with the sample layout's grid and fresh copies of its zones
 * (the empty-layout card's "Use sample layout").
 */
export function withSampleZones(profile: MonitorProfile, sample: MonitorProfile): MonitorProfile {
  return {
    ...profile,
    cols: sample.cols,
    rows: sample.rows,
    placements: sample.placements.map(clonePlacement),
  };
}
