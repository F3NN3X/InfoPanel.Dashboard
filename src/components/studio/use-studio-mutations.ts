import type { HistorySetter } from "@/hooks/use-config-history";
import {
  BLANK_MODULE,
  PANEL_ID,
  newProfile,
  uid,
  type DashboardConfig,
  type MonitorProfile,
  type Placement,
  type SourcePref,
} from "@/lib/layout";
import { findPanelPreset, type PanelPreset } from "@/lib/panelPresets";
import type { ModuleSettings } from "@/modules/types";
import * as actions from "./studio-actions";
import { deletePanelPreset, renamePanelPreset, savePanelPreset } from "./panel-preset-actions";
import { moduleMinSize } from "./studio-modules";
import type { StudioSelection } from "./use-studio-selection";
import { enforceMinSize, fitZoneRect, moveZoneSet, resizeZone, type ZoneRect } from "./zone-geometry";

interface MutationDeps {
  config: DashboardConfig;
  /** The resolved (active) grid profile being edited. */
  profile: MonitorProfile;
  setConfig: HistorySetter;
  sel: StudioSelection;
  /** Close the panel inspector's preset name input. */
  onPresetSaved: () => void;
  /** The window size a new profile starts with. */
  windowSize: { width: number; height: number };
}

const sameRect = (zone: Placement, rect: ZoneRect) =>
  zone.colStart === rect.col &&
  zone.rowStart === rect.row &&
  zone.colSpan === rect.cols &&
  zone.rowSpan === rect.rows;

/**
 * Every edit the studio makes to the config, through the undo history.
 * Same-`key` changes coalesce into one undo step (a drag, a key repeat).
 */
export function useStudioMutations({ config, profile, setConfig, sel, onPresetSaved, windowSize }: MutationDeps) {
  const { selected } = sel;

  /** Mutate the active profile; same-`key` changes coalesce in undo. */
  const updateProfile = (fn: (p: MonitorProfile) => MonitorProfile, key?: string) => {
    setConfig(
      (c) => ({
        ...c,
        profiles: c.profiles.map((p) => (p.id === profile.id ? fn(p) : p)),
      }),
      key
    );
  };

  /** Generic placement mutation (settings, design, ...). */
  const updatePlacement = (id: string, fn: (p: Placement) => Placement, key?: string) =>
    updateProfile((p) => actions.updatePlacement(p, id, fn), key);

  /** Mutate the primary zone; keyed edits coalesce per zone. */
  const updateSelected = (fn: (p: Placement) => Placement, key?: string) => {
    if (selected) updatePlacement(selected.id, fn, key && `${selected.id}:${key}`);
  };

  const addPlacement = (module: string) => {
    const id = uid(module);
    updateProfile((p) => actions.addModulePlacement(p, id, module, moduleMinSize(module)));
    sel.select(id);
  };

  /** Add a pre-designed panel (a group of widgets) from a preset. */
  const addPanelPreset = (preset: PanelPreset) => {
    const id = uid(PANEL_ID);
    updateProfile((p) => actions.addPresetPlacement(p, id, preset));
    sel.select(id);
  };

  /** Add a panel preset (built in, starter or saved) by id. */
  const addPanelPresetById = (presetId: string) => {
    const preset = findPanelPreset(presetId, config.panelPresets);
    if (preset) addPanelPreset(preset);
  };

  /** Save the primary panel zone to My panels (one undo step). */
  const savePanelAsPreset = (name: string) => {
    if (selected?.panel) setConfig((c) => savePanelPreset(c, selected, uid("panelpreset"), name));
    onPresetSaved();
  };

  const renameSavedPanel = (id: string, name: string) => setConfig((c) => renamePanelPreset(c, id, name));
  const deleteSavedPanel = (id: string) => setConfig((c) => deletePanelPreset(c, id));

  /** A zone drawn on the canvas becomes a blank zone, then is selected. */
  const addDrawnZone = (rect: ZoneRect) => {
    const id = uid(BLANK_MODULE);
    updateProfile((p) => actions.addBlankZone(p, id, rect));
    sel.select(id);
  };

  const toggleVisible = (id: string) => updateProfile((p) => actions.toggleVisible(p, id));
  const removePlacement = (id: string) => updateProfile((p) => actions.removePlacement(p, id));

  /** Copy zones to free spots (one undo step) and select the copies. */
  const duplicateZones = (ids: readonly string[]) => {
    let copies: string[] = [];
    updateProfile((p) => {
      const result = actions.duplicateZones(p, ids);
      copies = result.copies;
      return result.profile;
    });
    // The history setter runs the update synchronously.
    if (copies.length > 0) sel.selectMany(copies);
  };

  /* The selection's hide / duplicate / remove (toolbar, keys, palette). */
  const toggleSelectionVisible = () => {
    if (sel.selectedIds.length > 0) updateProfile((p) => actions.toggleZonesVisible(p, sel.selectedIds));
  };
  const duplicateSelection = () => duplicateZones(sel.selectedIds);
  const removeSelection = () => {
    if (sel.selectedIds.length > 0) updateProfile((p) => actions.removeZones(p, sel.selectedIds));
  };

  /** Set a zone's box; `key` makes a drag or key repeat one undo step. */
  const setZoneRect = (id: string, rect: ZoneRect, key?: string) => {
    const zone = profile.placements.find((p) => p.id === id);
    if (!zone || !sameRect(zone, rect)) updateProfile((p) => actions.setZoneRect(p, id, rect), key);
  };

  /** Set several zones' boxes as one step (a multi-zone drag or nudge). */
  const setZoneRects = (rects: Record<string, ZoneRect>, key?: string) => {
    const changed = profile.placements.some((p) => rects[p.id] && !sameRect(p, rects[p.id]));
    if (changed) updateProfile((p) => actions.setZoneRects(p, rects), key);
  };

  /** Arrow keys: move the whole selection one cell (all or nothing). */
  const moveSelection = (delta: { cols: number; rows: number }) => {
    const ids = sel.selectedIds;
    const rects = moveZoneSet(profile.placements, ids, delta, profile.cols, profile.rows);
    if (rects) setZoneRects(rects, `zone-nudge:${ids.join()}`);
  };

  /** The primary zone at a new size (toolbar steps); null = blocked. */
  const resizeSelected = (size: { cols: number; rows: number }) =>
    selected
      ? resizeZone(selected, size, profile.placements, profile.cols, profile.rows, actions.zoneMinSize(selected))
      : null;

  /** Shift+arrows: resize the primary zone one cell. */
  const resizePrimary = (delta: { cols: number; rows: number }) => {
    if (!selected) return;
    const rect = resizeSelected({ cols: selected.colSpan + delta.cols, rows: selected.rowSpan + delta.rows });
    if (rect) setZoneRect(selected.id, rect, `zone-resize:${selected.id}`);
  };

  /**
   * Set the primary zone's box (inspector inputs), at least its minimum
   * size, clamped + no overlap; a box that can't be placed keeps the old one.
   */
  const setZoneBox = (patch: Partial<ZoneRect>) => {
    if (!selected) return;
    const next = enforceMinSize(
      { col: selected.colStart, row: selected.rowStart, cols: selected.colSpan, rows: selected.rowSpan, ...patch },
      selected,
      actions.zoneMinSize(selected)
    );
    const clamped = fitZoneRect(next, profile.placements, profile.cols, profile.rows, selected.id);
    if (clamped) setZoneRect(selected.id, clamped, `zone-box:${selected.id}`);
  };

  /** Assign a widget to a zone (blank, module, or preset panel). */
  const assignWidget = (id: string, value: string) => {
    if (value === "blank") {
      updateProfile((p) => actions.clearWidget(p, id));
    } else if (value.startsWith("module:")) {
      const module = value.slice("module:".length);
      updateProfile((p) => actions.assignModule(p, id, module, moduleMinSize(module)));
    } else if (value.startsWith("preset:")) {
      const preset = findPanelPreset(value.slice("preset:".length), config.panelPresets);
      if (preset) updateProfile((p) => actions.assignPreset(p, id, preset));
    }
  };

  const addProfile = () => {
    const np = newProfile(`${windowSize.width}×${windowSize.height}`, windowSize.width, windowSize.height);
    setConfig((c) => ({
      ...c,
      profiles: [...c.profiles, np],
      activeProfile: np.id,
    }));
  };

  const removeProfile = () => {
    if (config.profiles.length <= 1) return;
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.filter((p) => p.id !== profile.id),
      activeProfile: "auto",
    }));
  };

  const activateProfile = (id: string) => setConfig((c) => ({ ...c, activeProfile: id }));

  /* Sources mode: per-source preferences and binding a zone to a source. */
  const setSourcePref = (key: string, pref: Partial<SourcePref>) =>
    setConfig(
      (c) => ({
        ...c,
        sourcePrefs: { ...c.sourcePrefs, [key]: { ...c.sourcePrefs?.[key], ...pref } },
      }),
      `source-pref:${key}`
    );
  const bindSource = (placementId: string, container: string) =>
    updatePlacement(placementId, (p) => ({ ...p, settings: { ...p.settings, source: container } }));
  const unbindSource = (placementId: string) =>
    updatePlacement(placementId, (p) => {
      const settings = { ...p.settings };
      delete settings.source;
      return { ...p, settings };
    });

  const saveStylePreset = (name: string, settings: ModuleSettings) =>
    setConfig((c) => ({
      ...c,
      stylePresets: [...(c.stylePresets ?? []), { id: uid("style"), name, settings }],
    }));

  const deleteStylePreset = (id: string) =>
    setConfig((c) => ({
      ...c,
      stylePresets: c.stylePresets?.filter((p) => p.id !== id),
    }));

  return {
    updateProfile,
    updatePlacement,
    updateSelected,
    addPlacement,
    addPanelPreset,
    addPanelPresetById,
    savePanelAsPreset,
    renameSavedPanel,
    deleteSavedPanel,
    addDrawnZone,
    toggleVisible,
    removePlacement,
    duplicateZones,
    toggleSelectionVisible,
    duplicateSelection,
    removeSelection,
    setZoneRect,
    setZoneRects,
    moveSelection,
    resizeSelected,
    resizePrimary,
    setZoneBox,
    assignWidget,
    addProfile,
    removeProfile,
    activateProfile,
    setSourcePref,
    bindSource,
    unbindSource,
    saveStylePreset,
    deleteStylePreset,
  };
}

export type StudioMutations = ReturnType<typeof useStudioMutations>;
