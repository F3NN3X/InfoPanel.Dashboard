import type { DashboardConfig } from "./layout";
import { WIDGET_PRESET_CAPS, type UserWidgetPreset } from "./widget-presets";

/** The edits of the saved widget presets, each config to config (one undo step). In a chunk of its own: they run on a user's action. */

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

/** A copy named "‹name› copy", right after it, with a new id. */
export function duplicateWidgetPreset(config: DashboardConfig, id: string, copyId: string, created: string): DashboardConfig {
  const list = config.widgetPresets ?? [];
  const at = list.findIndex((p) => p.id === id);
  if (at < 0) return config;
  const copy: UserWidgetPreset = { ...list[at], id: copyId, name: `${list[at].name} copy`.slice(0, WIDGET_PRESET_CAPS.name), settings: { ...list[at].settings }, created };
  return list.length >= WIDGET_PRESET_CAPS.total ? config : { ...config, widgetPresets: [...list.slice(0, at + 1), copy, ...list.slice(at + 1)] };
}
