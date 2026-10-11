import { clonePanel, type DashboardConfig, type Placement } from "@/lib/layout";
import { panelSettings, type UserPanelPreset } from "@/lib/panel-model";
import { PANEL_SETTINGS } from "@/modules/standard-settings";
import { settingKeys, type ModuleSettings } from "@/modules/types";

/*
 * The user's saved panels (`config.panelPresets`): save the selected
 * panel, rename and delete. Pure; each returns a new config, so each is
 * one undo step.
 */

const PANEL_KEYS = new Set(PANEL_SETTINGS.flatMap(settingKeys));

/** A panel zone's look: its settings (with the legacy fallbacks) limited to the panel style keys. */
function panelLook(pl: Placement): ModuleSettings | undefined {
  const own = Object.entries(panelSettings(pl) ?? {}).filter(([key]) => PANEL_KEYS.has(key));
  return own.length > 0 ? Object.fromEntries(own) : undefined;
}

/** A saved copy of a panel zone: arrangement, widgets, look and footprint. */
export function panelPresetFrom(pl: Placement, id: string, name: string): UserPanelPreset {
  return {
    id,
    name,
    colSpan: pl.colSpan,
    rowSpan: pl.rowSpan,
    panel: clonePanel(pl.panel!),
    settings: panelLook(pl),
  };
}

/** Append a saved panel (zones without a panel are ignored). */
export function savePanelPreset(
  config: DashboardConfig,
  pl: Placement,
  id: string,
  name: string
): DashboardConfig {
  if (!pl.panel) return config;
  return { ...config, panelPresets: [...(config.panelPresets ?? []), panelPresetFrom(pl, id, name)] };
}

export function renamePanelPreset(config: DashboardConfig, id: string, name: string): DashboardConfig {
  return {
    ...config,
    panelPresets: config.panelPresets?.map((p) => (p.id === id ? { ...p, name } : p)),
  };
}

/** Delete a saved panel; the last one leaves no list behind. */
export function deletePanelPreset(config: DashboardConfig, id: string): DashboardConfig {
  const rest = config.panelPresets?.filter((p) => p.id !== id) ?? [];
  return { ...config, panelPresets: rest.length > 0 ? rest : undefined };
}
