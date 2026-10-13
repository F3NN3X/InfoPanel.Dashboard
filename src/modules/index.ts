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
import { TEMPLATE_MODULES } from "@/widgets/registry";
import type { DashboardModule } from "./types";

/**
 * Dashboard module registry. Each InfoPanel plugin (or value source) is a
 * self-contained module: it claims its own sensor keys and renders its own
 * section. Add a new plugin by adding a module here — the App renders
 * everything registered and feeds unclaimed keys to the generic fallback.
 */
const legacyModules: DashboardModule[] = [
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

/** The legacy modules, then the template widgets (`src/widgets/registry.ts`). */
export const modules: DashboardModule[] = [...legacyModules, ...TEMPLATE_MODULES];

// Only the legacy modules claim keys for the "Other sensors" catch-all: a template's prefixes count
// as claimed only while it is placed, so listing it in the registry must not empty the catch-all.
const claimedPrefixes = legacyModules.flatMap((m) => m.prefixes);

/** True when a registered module owns the key. */
export function isClaimed(key: string): boolean {
  return claimedPrefixes.some((p) => key.startsWith(p));
}

/** Every prefix a module renders from (owned and read). */
export function moduleReads(mod: DashboardModule): string[] {
  return [...mod.prefixes, ...(mod.reads ?? [])];
}

export type { DashboardModule, SensorMap } from "./types";
