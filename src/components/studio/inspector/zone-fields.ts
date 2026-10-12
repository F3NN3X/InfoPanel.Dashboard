import { CARDS_ID, type Placement } from "@/lib/layout";
import { panelLegacyLook, panelOwnSettings } from "@/lib/panel-model";
import type { Appearance } from "@/lib/style-resolve";
import { modules } from "@/modules";
import { CARD_SETTINGS, PANEL_SETTINGS, PROFILE_STYLE_KEYS } from "@/modules/standard-settings";
import { settingKeys, type ModuleSetting, type ModuleSettingValue, type ModuleSettings } from "@/modules/types";
import { lookEditPatch, widgetLookValues, type LookValues } from "../inspector-model";
import { dropKeys } from "../settings-model";

/**
 * A zone's settings for the inspector: its schema, where its values come
 * from, what each row shows, and the edits (an edit of a look key while
 * the zone follows the global style makes it Custom in the same change).
 */

/** The settings schema of a zone (a panel's look, the generic cards' look, or the widget's). */
export function zoneDefs(zone: Placement): ModuleSetting[] {
  if (zone.panel) return PANEL_SETTINGS;
  if (zone.module === CARDS_ID) return CARD_SETTINGS;
  return modules.find((m) => m.id === zone.module)?.settings ?? [];
}

/** Where a zone's values come from: its own over the dashboard and profile style (and a panel's legacy look). */
export function zoneLookValues(zone: Placement, appearance: Appearance): LookValues {
  return widgetLookValues({
    // A panel's legacy title shows until set here.
    own: zone.panel ? panelOwnSettings(zone) : zone.settings,
    dashboard: appearance.dashboard,
    profile: appearance.profile,
    moduleDefaults: zone.panel ? panelLegacyLook(zone) : undefined,
    mode: zone.styleMode,
    enforce: appearance.enforce,
  });
}

/** The value a row shows: the own value (unless ignored), else the inherited one, else the default. */
export function shownValue(values: LookValues, key: string, def: ModuleSetting): ModuleSettingValue {
  const ignored = values.ignoreOwn && PROFILE_STYLE_KEYS.has(key);
  return (ignored ? undefined : values.own?.[key]) ?? values.inherited?.[key] ?? def.default;
}

/** Every shown value of a schema (what `visibleIf` reads). */
export function shownValues(values: LookValues, defs: readonly ModuleSetting[]): ModuleSettings {
  return Object.fromEntries(defs.flatMap((def) => settingKeys(def).map((k) => [k, shownValue(values, k, def)])));
}

/** A zone with settings set; a look edit while it follows switches it to Custom (`lookEditPatch`). */
export function withSettings(zone: Placement, patch: ModuleSettings, enforce: boolean): Placement {
  return { ...zone, settings: { ...zone.settings, ...patch }, ...lookEditPatch(Object.keys(patch), zone.styleMode, enforce) };
}

/** A zone without some own settings. */
export function withoutSettings(zone: Placement, keys: readonly string[]): Placement {
  return { ...zone, settings: dropKeys(zone.settings, new Set(keys)) };
}
