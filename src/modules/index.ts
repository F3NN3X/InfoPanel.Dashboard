import { systemModule } from "./system";
import { hardwareModule } from "./hardware";
import { spotifyModule } from "./spotify";
import type { DashboardModule, SensorMap } from "./types";

/**
 * Dashboard module registry. Each InfoPanel plugin (or value source) is a
 * self-contained module: it claims its own sensor keys and renders its own
 * section. Add a new plugin by adding a module here — the App renders
 * everything registered and feeds unclaimed keys to the generic fallback.
 */
export const modules: DashboardModule[] = [
  systemModule,
  spotifyModule,
  hardwareModule,
];

/** Keys claimed by at least one registered module. */
export function claimedKeys(sensors: SensorMap): Set<string> {
  const claimed = new Set<string>();
  for (const key of Object.keys(sensors)) {
    if (modules.some((m) => m.matches(key))) claimed.add(key);
  }
  return claimed;
}

export type { DashboardModule, SensorMap } from "./types";
