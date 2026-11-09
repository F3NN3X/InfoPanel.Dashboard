import type { ModuleSettings } from "@/modules/types";

/**
 * The presets a user saved for a widget (`config.widgetPresets`, config v19): its view, its settings and the size it opens at.
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
 * The saved presets, in save order, and one widget's. The list is the config's own (what the studio saved, or what an import or restore
 * let through the guard); an entry that is not shaped like one is skipped rather than trusted.
 */
export const savedWidgetPresets = (list: readonly UserWidgetPreset[] | undefined): UserWidgetPreset[] =>
  (Array.isArray(list) ? list : []).filter((p) => typeof p?.widget === "string" && typeof p.id === "string" && typeof p.name === "string" && p.settings && p.size?.length === 2);

export const widgetPresetsOf = (list: readonly UserWidgetPreset[] | undefined, widget: string): UserWidgetPreset[] => savedWidgetPresets(list).filter((p) => p.widget === widget);
