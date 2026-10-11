import {
  BLANK_MODULE,
  PANEL_ID,
  clonePlacement,
  type MonitorProfile,
  type Placement,
} from "@/lib/layout";
import type { PanelPreset } from "@/lib/panelPresets";
import type { ModuleSettings } from "@/modules/types";
import { firstFreeRect, type ZoneRect } from "./zone-geometry";

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

/** Add a pre-designed panel (a group of widgets) from a preset. */
export function addPresetPlacement(
  profile: MonitorProfile,
  id: string,
  preset: PanelPreset
): MonitorProfile {
  return appendAtFreeSlot(
    profile,
    { cols: preset.colSpan, rows: preset.rowSpan },
    (pos) => ({ ...zoneAt(id, PANEL_ID, pos), panel: preset.make() })
  );
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

/** Grow a zone to at least `min` cells, kept inside the grid. */
function growTo(profile: MonitorProfile, p: Placement, min: Size) {
  const cols = Math.min(Math.max(p.colSpan, min.cols), profile.cols);
  const rows = Math.min(Math.max(p.rowSpan, min.rows), profile.rows);
  return {
    colSpan: cols,
    rowSpan: rows,
    colStart: Math.min(p.colStart, profile.cols - cols + 1),
    rowStart: Math.min(p.rowStart, profile.rows - rows + 1),
  };
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
  return updatePlacement(profile, id, (p) => ({
    ...p,
    module: PANEL_ID,
    panel: preset.make(),
    settings: undefined,
    ...growTo(profile, p, { cols: preset.colSpan, rows: preset.rowSpan }),
  }));
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
