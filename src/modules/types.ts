import type { ReactNode } from "react";
import type { SensorValue } from "@/hooks/useSensors";
import type { IslandSourceDef } from "@/lib/island/sources";

export type SensorMap = Record<string, SensorValue>;

export type ModuleSettingValue = string | number | boolean;
export type ModuleSettings = Record<string, ModuleSettingValue>;

/** The inspector tabs of a widget or panel zone. */
export type InspectorTab = "content" | "style" | "data";

/** The device kinds a select can list from the live keys (`optionsFrom`). */
export type DeviceKind = "cpu" | "gpu" | "disk" | "adapter" | "audio" | "drive";
/** Whether an `optionsFrom` value is one of the device kinds. */
export const isDeviceKind = (v: string | undefined): v is DeviceKind =>
  v === "cpu" || v === "gpu" || v === "disk" || v === "adapter" || v === "audio" || v === "drive";

/**
 * One inspector-editable option. The studio renders controls from this
 * schema; values are stored per-placement (see Placement.settings).
 */
export interface ModuleSetting {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "color" | "icon" | "image" | "align" | "sensor" | "sensorItems";
  default: ModuleSettingValue;
  /**
   * For type "align": the vertical key, written together with `key` (the
   * horizontal one) by a 3×3 alignment picker. Both default to `default`.
   */
  keyY?: string;
  /**
   * For type "sensorItems": the key of the multi-sensor setting whose sensors get one
   * override row each. The overrides are stored as a JSON object string under `key`.
   */
  of?: string;
  /** Extra search terms (the settings search also matches label, key and options). */
  keywords?: string[];
  /** Options for type "select". */
  options?: {
    value: string;
    label: string;
    /**
     * Preset bundle: extra values this option applies when selected (the
     * studio persists each one alongside the option's own value).
     */
    applies?: ModuleSettings;
  }[];
  /**
   * For type "select": where the option list comes from instead of the static
   * `options`.
   * - `"sources"` — the containers `sourcePlugin` currently exposes (live
   *   sensor data, no hardcoded device lists).
   * - `"media"` — the browser's audio *capture* devices (live
   *   `enumerateDevices()`, no Data API involved). Used for the Web-Audio
   *   live-capture source binding.
   * - `"wavelink"` — the Wave Link app's meter inventory (channels + output
   *   devices) from the wavelink-plugin; options are the meter keys the
   *   widget filters on, "" = all meters.
   * - `"cpu" | "gpu" | "disk" | "adapter" | "audio" | "drive"` — the devices
   *   found in the live keys (`deviceOptions`), "" = Auto first. Data tab by default.
   */
  optionsFrom?: "sources" | "media" | "wavelink" | DeviceKind;
  /** Key prefix whose containers become the dynamic select's options. */
  sourcePlugin?: string;
  /**
   * For type "select" (or "sensor"): allow picking several options. The value
   * is stored as a comma-separated string ("" = none), ordered. Rendered as a
   * checkbox list in the studio (a list of bound sensors for "sensor").
   */
  multiple?: boolean;
  /** For type "text": a multi-line editor (e.g. custom CSS). */
  multiline?: boolean;
  /** Bounds/step for type "number" (rendered as a slider when set). */
  min?: number;
  max?: number;
  step?: number;
  /**
   * Inspector section this setting belongs to ("" / unset = the top list).
   * Settings sharing a group render together in a collapsible section,
   * placed where the group first appears.
   */
  group?: string;
  /**
   * The inspector tab it sits in. Unset: its category's tab (general
   * categories by their kind, a widget's own categories in Content, those made
   * of color pickers in Style) — see `inspector-categories.ts`.
   */
  tab?: InspectorTab;
  /** Tucked away until "Advanced settings" is on (its category's flag also counts). */
  advanced?: boolean;
  /** One-line explanation, shown behind an info icon. */
  hint?: string;
  /** Shown only while this holds for the zone's effective values (default: always). */
  visibleIf?: (values: ModuleSettings) => boolean;
}

/**
 * A dashboard module = one InfoPanel plugin (or value source) rendered as a
 * self-contained section. The App renders every registered module and feeds
 * unclaimed sensor keys to the generic fallback grid.
 */
export interface DashboardModule {
  /** Stable id, e.g. "SystemOverview" | "NowPlaying" | "Thermals" */
  id: string;
  /** Section title */
  title: string;
  /** Minimum zone footprint this widget renders well in (grid cells). */
  minCols?: number;
  minRows?: number;
  /**
   * Key prefixes this module owns: the generic fallback skips these keys,
   * and the placement re-renders when one of them changes.
   */
  prefixes: string[];
  /** Further prefixes the module reads without owning them. */
  reads?: string[];
  /** Reads keys it cannot name up front (no prefixes, but needs data): the zone subscribes to every stream. */
  readsAll?: boolean;
  /** Render the module's cards. Return null to hide the section. */
  render: (sensors: SensorMap, settings?: ModuleSettings) => ReactNode;
  /** Inspector-editable options; omit for modules with no settings. */
  settings?: ModuleSetting[];
  /** Library chip (`INSERT_CATEGORIES`); unset: "Generic". */
  category?: string;
  /** Library card icon: a Material Symbols or widget-icon name (`widgets/core/icons.ts`). */
  icon?: string;
  /** Library card description. */
  description?: string;
  /** Footprint (cols, rows) a drop gets when larger than the minimum; unset: 3×2 or the minimum. */
  defaultSize?: [number, number];
  /** What the widget sends to the Dynamic Island when its "Send to island" is on (`src/lib/island/sources.ts`). */
  island?: IslandSourceDef;
}

/** The keys a setting stores (two for an "align" picker). */
export function settingKeys(def: ModuleSetting): string[] {
  return def.keyY ? [def.key, def.keyY] : [def.key];
}

/** The module's defaults, merged with a placement's saved settings. */
export function effectiveSettings(
  mod: Pick<DashboardModule, "settings">,
  saved?: ModuleSettings
): ModuleSettings {
  const out: ModuleSettings = {};
  for (const def of mod.settings ?? []) {
    for (const key of settingKeys(def)) out[key] = saved?.[key] ?? def.default;
  }
  return out;
}

/**
 * A placement's saved settings over the profile's style defaults: the
 * widget's own value wins, then the profile's, then (in
 * `effectiveSettings`) the module default. Rendering resolves the full
 * dashboard → profile → own layering with follow / force instead
 * (`resolveStyle` in `lib/style-resolve.ts`).
 */
export function withProfileStyle(
  saved: ModuleSettings | undefined,
  profileStyle: ModuleSettings | undefined
): ModuleSettings | undefined {
  if (!profileStyle || Object.keys(profileStyle).length === 0) return saved;
  return { ...profileStyle, ...saved };
}
