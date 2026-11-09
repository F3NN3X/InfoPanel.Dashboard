import { useEffect, useState } from "react";
import type { ModuleSettings } from "@/modules/types";
import type { WidgetPreset } from "@/widgets/define";
import { widgetPresetsOf, type UserWidgetPreset } from "@/lib/widget-presets";
import type { ModuleMeta } from "./studio-modules";

/**
 * A widget's presets (`src/widgets/<folder>/presets.ts`, FORMAT.md §11): the built-in ones, then the user's. The built-in lists
 * are a lazy studio chunk (`widget-presets-data.ts`), never the kiosk's; until it has loaded a widget reads as its one implicit
 * default.
 */

/** Built-in preset lists by widget id (a widget without a presets.ts has no entry). */
export type PresetMap = Readonly<Record<string, readonly WidgetPreset[]>>;

let loading: Promise<PresetMap> | undefined;

/** The built-in presets, loaded once. */
export const loadWidgetPresets = (): Promise<PresetMap> => (loading ??= import("./widget-presets-data").then((m) => m.default));

const NONE: PresetMap = {};
let loaded: PresetMap = NONE;

/** The built-in presets; empty until the chunk has loaded. */
export function useWidgetPresets(): PresetMap {
  const [map, setMap] = useState<PresetMap>(loaded);
  useEffect(() => {
    let live = true;
    void loadWidgetPresets().then((m) => {
      loaded = m;
      if (live) setMap(m);
    });
    return () => {
      live = false;
    };
  }, []);
  return map;
}

/** A widget's default size: its declared one, else 3×2; never below its minimum. */
export function defaultSize(def: [number, number] | undefined, mw: number, mh: number): [number, number] {
  const [w, h] = def ?? [3, 2];
  return [Math.max(w, mw), Math.max(h, mh)];
}

/** A widget's built-in presets: its presets.ts, else one implicit default (its default view, no settings, its default size). */
export function builtinPresets(m: ModuleMeta, map: PresetMap): readonly WidgetPreset[] {
  return map[m.id] ?? [{ id: "default", name: m.views?.[0]?.name ?? "Default", view: m.views?.[0]?.id, settings: {}, size: defaultSize(m.defaultSize, m.minCols, m.minRows), default: true }];
}

/** The settings a preset adds a widget with (the default preset adds none: a fresh widget is it). */
export function addSettings(m: Pick<ModuleMeta, "viewKey">, p: Pick<WidgetPreset, "view" | "settings" | "default">): ModuleSettings | undefined {
  return p.default ? undefined : { ...(p.view ? { [m.viewKey ?? "view"]: p.view } : {}), ...p.settings };
}

/** A user's saved preset as a built-in one's shape. */
export const userPreset = (p: UserWidgetPreset): WidgetPreset => ({ id: p.id, name: p.name, view: p.view, settings: p.settings, size: p.size });

/** Built-in presets, then the user's saved ones for the widget. */
export const presetsFor = (m: ModuleMeta, map: PresetMap, saved: readonly UserWidgetPreset[] | undefined): WidgetPreset[] => [
  ...builtinPresets(m, map),
  ...widgetPresetsOf(saved, m.id).map(userPreset),
];
