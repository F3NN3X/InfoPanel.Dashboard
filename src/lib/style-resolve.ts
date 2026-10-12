import { PROFILE_STYLE_KEYS } from "@/modules/standard-settings";
import type { ModuleSettings } from "@/modules/types";

/**
 * Where a widget's look comes from. Only the look keys
 * (`PROFILE_STYLE_KEYS`) are layered, lowest first:
 *
 *   module default → dashboard style → profile style → the widget's own
 *
 * A widget set to "follow" (or every widget, while the global style is
 * forced) skips its own look values — they stay stored, inactive. Content
 * keys (sensor, layout, title, …) always come from the widget.
 */

/** A widget's choice: take the global style, or keep its own look. */
export type StyleMode = "follow" | "custom";

/** The layer a resolved look value comes from. */
export type StyleSource = "default" | "dashboard" | "profile" | "own";

/** The global style a placement renders under. */
export interface Appearance {
  /** `DashboardConfig.style`: every profile. */
  dashboard?: ModuleSettings;
  /** `MonitorProfile.style`: this profile, over the dashboard's. */
  profile?: ModuleSettings;
  /** Force the global style on every widget (own looks ignored). */
  enforce: boolean;
}

export interface StyleInput {
  /** The lowest layer (a module's defaults, a panel's legacy look). */
  moduleDefaults?: ModuleSettings;
  dashboard?: ModuleSettings;
  profile?: ModuleSettings;
  /** The widget's saved settings (content and look). */
  own?: ModuleSettings;
  /** The widget's `styleMode` (absent: its own values win key by key). */
  mode?: StyleMode;
  enforce?: boolean;
}

export interface ResolvedStyle {
  /** Content keys from `own`, look keys from the strongest layer. */
  settings: ModuleSettings;
  /** The layer of each look key that is set somewhere. */
  source: Record<string, StyleSource>;
}

/** Whether a profile renders with the global style forced (the profile's choice wins). */
export function isEnforced(
  config: { styleEnforce?: boolean },
  profile: { styleEnforce?: boolean } | undefined
): boolean {
  return profile?.styleEnforce ?? config.styleEnforce ?? false;
}

/** The global style of a profile (see `resolveStyle`). */
export function appearanceOf(
  config: { style?: ModuleSettings; styleEnforce?: boolean },
  profile: { style?: ModuleSettings; styleEnforce?: boolean } | undefined
): Appearance {
  return { dashboard: config.style, profile: profile?.style, enforce: isEnforced(config, profile) };
}

/** Whether a widget's own look is ignored (it follows, or the style is forced). */
export const followsGlobal = (mode: StyleMode | undefined, enforce: boolean | undefined): boolean =>
  Boolean(enforce) || mode === "follow";

/** Layer the look keys (see the module comment). */
export function resolveStyle(input: StyleInput): ResolvedStyle {
  const settings: ModuleSettings = {};
  const source: Record<string, StyleSource> = {};
  for (const [key, value] of Object.entries(input.own ?? {})) {
    if (!PROFILE_STYLE_KEYS.has(key)) settings[key] = value;
  }
  const layers: [StyleSource, ModuleSettings | undefined][] = [
    ["default", input.moduleDefaults],
    ["dashboard", input.dashboard],
    ["profile", input.profile],
    ["own", followsGlobal(input.mode, input.enforce) ? undefined : input.own],
  ];
  for (const [layer, values] of layers) {
    for (const [key, value] of Object.entries(values ?? {})) {
      if (!PROFILE_STYLE_KEYS.has(key) || value === undefined) continue;
      settings[key] = value;
      source[key] = layer;
    }
  }
  return { settings, source };
}

/** A widget's settings under a global style (`own` with its mode). */
export function resolveWith(
  appearance: Appearance | undefined,
  own: ModuleSettings | undefined,
  mode: StyleMode | undefined,
  moduleDefaults?: ModuleSettings
): ModuleSettings | undefined {
  if (!appearance) return own;
  const { settings } = resolveStyle({
    moduleDefaults,
    dashboard: appearance.dashboard,
    profile: appearance.profile,
    own,
    mode,
    enforce: appearance.enforce,
  });
  return Object.keys(settings).length > 0 ? settings : undefined;
}
