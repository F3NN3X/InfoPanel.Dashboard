import {
  spotifyModernModule,
  mediaModernModule,
} from "./modern-media";
import { weatherModernModule } from "./weather-modern";
import { steamModernModule } from "./steam-modern";
import { systemModernModule } from "./system-modern";
import { fpsModernModule } from "./fps-modern";
import { hardwareModernModule } from "./hardware-modern";
import { audioModernModule } from "./audio-modern";
import { wavelinkModernModule } from "./wavelink-modern";
import { bluetoothModernModule } from "./bluetooth-modern";
import { networkModernModule } from "./network-modern";
import { vbzModule } from "./vbz";
import { notificationsModule } from "./notifications";
import { textfileModule } from "./textfile";
import { streamdeckModule } from "./streamdeck";
import { webpageModule } from "./webpage";
import type { DashboardModule, SensorMap } from "./types";

/**
 * Dashboard module registry. Each InfoPanel plugin (or value source) is a
 * self-contained module: it claims its own sensor keys and renders its own
 * section. Add a new plugin by adding a module here — the App renders
 * everything registered and feeds unclaimed keys to the generic fallback.
 */
export const modules: DashboardModule[] = [
  systemModernModule,
  spotifyModernModule,
  mediaModernModule,
  steamModernModule,
  hardwareModernModule,
  weatherModernModule,
  fpsModernModule,
  audioModernModule,
  wavelinkModernModule,
  vbzModule,
  bluetoothModernModule,
  networkModernModule,
  notificationsModule,
  textfileModule,
  streamdeckModule,
  webpageModule,
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
