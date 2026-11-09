import type { ModuleSettings } from "@/modules/types";
import type { DashboardConfig } from "./layout";

/**
 * The presets a user saved for a widget (`config.widgetPresets`, config v20): its view, its settings and the size it opens at.
 * A flat list in save order, each entry naming its widget; the built-in ones live in the widget folders (`presets.ts`).
 */
export interface UserWidgetPreset {
  id: string;
  /** The widget id it belongs to. */
  widget: string;
  name: string;
  /** The `meta.views` id it sets; absent for a widget without views. */
  view?: string;
  settings: ModuleSettings;
  size: [number, number];
  /** ISO time it was saved. */
  created: string;
}

/** The most presets a config holds, and the longest name (the rest of the caps are the guard's: `widget-presets-guard.ts`). */
export const WIDGET_PRESET_CAPS = { total: 200, name: 60 } as const;

/**
 * One widget's saved presets, in save order. The list is the config's own (what the studio saved, or what an import or restore
 * let through the guard); an entry that is not shaped like one is skipped rather than trusted.
 */
export const widgetPresetsOf = (list: readonly UserWidgetPreset[] | undefined, widget: string): UserWidgetPreset[] =>
  (Array.isArray(list) ? list : []).filter((p) => p?.widget === widget && typeof p.id === "string" && typeof p.name === "string" && p.settings && p.size?.length === 2);

/** Save a preset (one undo step); past the cap the config is unchanged. */
export function saveWidgetPreset(config: DashboardConfig, preset: UserWidgetPreset): DashboardConfig {
  const list = Array.isArray(config.widgetPresets) ? config.widgetPresets : [];
  return list.length >= WIDGET_PRESET_CAPS.total ? config : { ...config, widgetPresets: [...list, preset] };
}

export const renameWidgetPreset = (config: DashboardConfig, id: string, name: string): DashboardConfig => ({
  ...config,
  widgetPresets: config.widgetPresets?.map((p) => (p.id === id ? { ...p, name: name.trim().slice(0, WIDGET_PRESET_CAPS.name) || p.name } : p)),
});

/** Delete a saved preset; the last one leaves no list behind. */
export function deleteWidgetPreset(config: DashboardConfig, id: string): DashboardConfig {
  const rest = config.widgetPresets?.filter((p) => p.id !== id) ?? [];
  return { ...config, widgetPresets: rest.length > 0 ? rest : undefined };
}
