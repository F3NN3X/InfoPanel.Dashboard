import type { ReactNode } from "react";
import type { SensorValue } from "@/hooks/useSensors";

export type SensorMap = Record<string, SensorValue>;

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
  render: (sensors: SensorMap) => ReactNode;
}
