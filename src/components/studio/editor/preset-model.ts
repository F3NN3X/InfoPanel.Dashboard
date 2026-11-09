import type { ModuleSettings, DashboardModule } from "@/modules/types";
import type { UserWidgetPreset } from "@/lib/widget-presets";
import type { WidgetPreset } from "@/widgets/define";
import { currentView, viewKeyOf, viewsOf } from "./view-presets";

/** What the Preset row reads of a zone: its stored view and settings against a widget's presets (built-in, then the user's). */

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** A zone's value for a key: stored, else the setting's default (a toggle never set reads as its default). */
const valueOf = (mod: DashboardModule, settings: ModuleSettings | undefined, key: string): unknown => settings?.[key] ?? mod.settings?.find((d) => d.key === key)?.default;

/** Whether the zone is on this preset: its view, and every setting the preset holds. */
export function presetHolds(mod: DashboardModule, preset: WidgetPreset, settings: ModuleSettings | undefined): boolean {
  const view = viewsOf(mod).length > 0 ? currentView(mod, settings) : undefined;
  return (preset.view ?? undefined) === view && Object.entries(preset.settings).every(([key, value]) => sameValue(valueOf(mod, settings, key), value));
}

/**
 * The preset the zone is on: the one that holds the most settings (a saved preset that adds to a built-in one wins over it),
 * the first on a tie, so a built-in beats a saved copy of itself. None = Custom.
 */
export function matchingPreset(mod: DashboardModule, presets: readonly WidgetPreset[], settings: ModuleSettings | undefined): WidgetPreset | undefined {
  return presets
    .filter((p) => presetHolds(mod, p, settings))
    .reduce<WidgetPreset | undefined>((best, p) => (!best || Object.keys(p.settings).length > Object.keys(best.settings).length ? p : best), undefined);
}

/**
 * Applying a preset: its view and settings (`{ [viewKey]: view, ...settings }`, as Add writes them), and the keys only another
 * preset's bundle set, while they still hold that preset's value, go back to their default. The size is not part of it.
 */
export function presetChange(mod: DashboardModule, presets: readonly WidgetPreset[], preset: WidgetPreset, settings: ModuleSettings | undefined): { patch: ModuleSettings; clear: string[] } {
  const clear = presets
    .filter((p) => p.id !== preset.id)
    .flatMap((p) => Object.entries(p.settings))
    .filter(([key, value]) => !(key in preset.settings) && sameValue(settings?.[key], value))
    .map(([key]) => key);
  return { patch: { ...(preset.view ? { [viewKeyOf(mod)]: preset.view } : {}), ...preset.settings }, clear: [...new Set(clear)] };
}

/** A preset saved from a zone: its view (when the widget has them), its other settings and the size it has. */
export function presetFromZone(mod: DashboardModule, settings: ModuleSettings | undefined, size: [number, number], id: string, name: string, created: string): UserWidgetPreset {
  const key = viewKeyOf(mod);
  const { [key]: _view, ...rest } = settings ?? {};
  const view = viewsOf(mod).length > 0 ? currentView(mod, settings) : undefined;
  return { id, widget: mod.id, name, ...(view ? { view } : {}), settings: rest, size, created };
}
