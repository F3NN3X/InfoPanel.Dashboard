import type { WlState } from "@/lib/wavelink";
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import { effectiveSettings } from "@/modules/types";
import type { Placement } from "@/lib/layout";
import type { Data } from "@/widgets/core/types";
import type { IslandBus } from "./bus";
import type { IslandActivity, IslandNotice } from "./types";

/**
 * Widgets as island sources. A template opts in with `island` (`TemplateOptions`): it gets a "Send
 * to island" setting, and while a zone of it has that on, the kiosk runs its `derive` on the data the
 * widget reads. `derive` is pure: the previous and the new data in, the notices to raise and the
 * current activity out. The first data is a baseline (`prev` null): it may set the activity but
 * raises no notice, so nothing fires on load.
 */

export type SourceNotice = Omit<IslandNotice, "source">;
export type SourceActivity = Omit<IslandActivity, "source">;

export interface IslandUpdate {
  notices?: SourceNotice[];
  /** The activity now (unset or null = none). */
  activity?: SourceActivity | null;
}

interface SourceBase {
  /** The setting's hint: what reaches the island. */
  hint: string;
  defaultOn: boolean;
  /** The widget's own settings group the "Send to island" toggle joins. */
  group: string;
}

/** From the sensor map, flattened as the template gets it (`toFlat`). */
export interface DataSourceDef extends SourceBase {
  from: "data";
  derive(prev: Data | null, next: Data, settings: ModuleSettings): IslandUpdate;
}

/** From the shared Wave Link client's state (`wavelink.subscribeState`). */
export interface WavelinkSourceDef extends SourceBase {
  from: "wavelink";
  derive(prev: WlState | null, next: WlState, settings: ModuleSettings): IslandUpdate;
}

export type IslandSourceDef = DataSourceDef | WavelinkSourceDef;

/** The zone setting that sends a widget to the island. */
export const ISLAND_SETTING = "island";

export const islandSetting = (def: IslandSourceDef): ModuleSetting => ({
  key: ISLAND_SETTING,
  label: "Send to island",
  type: "boolean",
  default: def.defaultOn,
  hint: def.hint,
  group: def.group,
  keywords: ["island", "notch", "notify", "notification"],
});

/** A widget feeding the island: its module (with `island`) and the zone's resolved settings. */
export interface IslandFeed {
  module: DashboardModule & { island: IslandSourceDef };
  settings: ModuleSettings;
}

/**
 * The widgets that feed the island from these zones (every page of the profile): visible zones whose
 * template has a source and whose "Send to island" is on. One per template, the first zone, so two
 * Now Playing zones raise each track once.
 */
export function islandFeeds(placements: readonly Placement[], modules: readonly DashboardModule[]): IslandFeed[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const feeds = new Map<string, IslandFeed>();
  for (const p of placements) {
    const mod = byId.get(p.module);
    if (!p.visible || !mod?.island || feeds.has(mod.id)) continue;
    const settings = effectiveSettings(mod, p.settings);
    if (settings[ISLAND_SETTING] !== true) continue;
    feeds.set(mod.id, { module: mod as IslandFeed["module"], settings });
  }
  return [...feeds.values()];
}

/** Hand one update to the bus as `source`: its notices raised, its activity set or cleared. */
export function applyUpdate(bus: IslandBus, source: string, update: IslandUpdate): void {
  for (const n of update.notices ?? []) bus.notify({ ...n, source });
  if (update.activity) bus.setActivity({ ...update.activity, source });
  else bus.clearActivity(source);
}

/** Every prefix a widget reads (`moduleReads`; not imported, the registry imports this file). */
export const readsOf = (mod: DashboardModule): string[] => [...mod.prefixes, ...(mod.reads ?? [])];

/** Whether the data holds a key under any of the prefixes (no prefixes: any key). */
export function hasData(data: Data, prefixes: readonly string[]): boolean {
  const keys = Object.keys(data);
  return prefixes.length === 0 ? keys.length > 0 : keys.some((k) => prefixes.some((p) => k.startsWith(p)));
}

/**
 * One pass of the data sources over the current flat data. `prev` keeps each source's last data (the
 * caller's ref): a source whose keys have not arrived yet is skipped, so its first data is the
 * baseline, not a change from nothing.
 */
export function runDataFeeds(bus: IslandBus, feeds: readonly IslandFeed[], flat: Data, prev: Map<string, Data>): void {
  for (const f of feeds) {
    const def = f.module.island;
    if (def.from !== "data" || !hasData(flat, readsOf(f.module))) continue;
    applyUpdate(bus, f.module.id, def.derive(prev.get(f.module.id) ?? null, flat, f.settings));
    prev.set(f.module.id, flat);
  }
}
