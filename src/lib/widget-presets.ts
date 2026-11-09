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

/** The caps `normalizeWidgetPresets` holds a saved list to. */
export const WIDGET_PRESET_CAPS = { total: 200, name: 60, id: 64, settingsBytes: 16_384, span: 48 } as const;

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;
const span = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= WIDGET_PRESET_CAPS.span;

/**
 * A saved list, guarded: an id, a widget, a name, a settings object within its byte cap and a whole-cell size are required
 * (a name is cut to its cap, a view that is not text is dropped), a repeated id keeps its first entry, the list stops at its
 * cap, none kept = undefined. A widget id this build has no widget for stays, as a newer build's saved preset must survive.
 */
export function normalizeWidgetPresets(v: unknown): UserWidgetPreset[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const kept: UserWidgetPreset[] = [];
  for (const p of v as Partial<Record<keyof UserWidgetPreset, unknown>>[]) {
    if (kept.length >= WIDGET_PRESET_CAPS.total) break;
    if (!isPlain(p) || !text(p.id, WIDGET_PRESET_CAPS.id) || seen.has(p.id) || !text(p.widget, WIDGET_PRESET_CAPS.id)) continue;
    if (typeof p.name !== "string" || p.name.trim() === "" || !isPlain(p.settings) || JSON.stringify(p.settings).length > WIDGET_PRESET_CAPS.settingsBytes) continue;
    if (!Array.isArray(p.size) || p.size.length !== 2 || !span(p.size[0]) || !span(p.size[1])) continue;
    seen.add(p.id);
    kept.push({
      id: p.id,
      widget: p.widget,
      name: p.name.trim().slice(0, WIDGET_PRESET_CAPS.name),
      ...(text(p.view, WIDGET_PRESET_CAPS.id) ? { view: p.view } : {}),
      settings: p.settings as ModuleSettings,
      size: [p.size[0], p.size[1]],
      created: typeof p.created === "string" ? p.created.slice(0, 40) : "",
    });
  }
  return kept.length > 0 ? kept : undefined;
}

/** One widget's saved presets, in save order. */
export const widgetPresetsOf = (list: readonly UserWidgetPreset[] | undefined, widget: string): UserWidgetPreset[] => (list ?? []).filter((p) => p.widget === widget);

/** Save a preset (one undo step); past the cap the config is unchanged. */
export function saveWidgetPreset(config: DashboardConfig, preset: UserWidgetPreset): DashboardConfig {
  const list = config.widgetPresets ?? [];
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
