import type { ReactNode } from "react";
import type { SensorValue } from "@/hooks/useSensors";

export type SensorMap = Record<string, SensorValue>;

export type ModuleSettingValue = string | number | boolean;
export type ModuleSettings = Record<string, ModuleSettingValue>;

/**
 * One inspector-editable option. The studio renders controls from this
 * schema; values are stored per-placement (see Placement.settings).
 */
export interface ModuleSetting {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "color" | "icon" | "image";
  default: ModuleSettingValue;
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
   */
  optionsFrom?: "sources" | "media" | "wavelink";
  /** Key prefix whose containers become the dynamic select's options. */
  sourcePlugin?: string;
  /**
   * For type "select": allow picking several options. The value is stored as
   * a comma-separated string ("" = none). Rendered as a checkbox list in the
   * studio.
   */
  multiple?: boolean;
  /** Bounds/step for type "number" (rendered as a slider when set). */
  min?: number;
  max?: number;
  step?: number;
}

/**
 * A dashboard module = one InfoPanel plugin (or value source) rendered as a
 * self-contained section. The App renders every registered module and feeds
 * unclaimed sensor keys to the generic fallback grid.
 */
export interface DashboardModule {
  /** Stable id, e.g. "systemmodern" | "spotifymodern" | "hardwaremodern" */
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
  /** Render the module's cards. Return null to hide the section. */
  render: (sensors: SensorMap, settings?: ModuleSettings) => ReactNode;
  /** Inspector-editable options; omit for modules with no settings. */
  settings?: ModuleSetting[];
}

/** The module's defaults, merged with a placement's saved settings. */
export function effectiveSettings(
  mod: DashboardModule,
  saved?: ModuleSettings
): ModuleSettings {
  const out: ModuleSettings = {};
  for (const def of mod.settings ?? []) {
    out[def.key] = saved?.[def.key] ?? def.default;
  }
  return out;
}
