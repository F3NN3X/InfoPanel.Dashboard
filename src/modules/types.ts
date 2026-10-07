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
  type: "text" | "number" | "select" | "boolean" | "color";
  default: ModuleSettingValue;
  /** Options for type "select". */
  options?: { value: string; label: string }[];
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
  /** Stable id, e.g. "system" | "spotify" | "hardware" */
  id: string;
  /** Section title */
  title: string;
  /** Sensor keys this module consumes — the generic fallback skips these. */
  matches: (key: string) => boolean;
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
