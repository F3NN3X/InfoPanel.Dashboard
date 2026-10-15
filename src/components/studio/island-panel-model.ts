import type { AlertRule, AlertsConfig } from "@/lib/alerts";
import { ISLAND_SETTING } from "@/lib/island/sources";
import type { DashboardConfig, MonitorProfile } from "@/lib/layout";
import { effectiveSettings, type DashboardModule, type ModuleSettingValue } from "@/modules/types";
import { allSections, widgetContext } from "./inspector-model";
import { placementTitle } from "./studio-modules";

/** One zone of the profile whose widget can send to the island. */
export interface IslandWidgetRow {
  pageId: string;
  pageName: string;
  zoneId: string;
  module: string;
  title: string;
  /** "Send to island" resolved over the widget's default. */
  on: boolean;
  /** A hidden zone sends nothing. */
  visible: boolean;
  /** Another zone of the same widget sends first (one per widget, `islandFeeds`). */
  shadowed: boolean;
}

/** Every zone, on every page of the profile, whose widget has an island source; page order, then zone order. */
export function islandWidgets(profile: MonitorProfile, modules: readonly DashboardModule[]): IslandWidgetRow[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const sending = new Set<string>();
  const rows: IslandWidgetRow[] = [];
  for (const page of profile.pages) {
    for (const p of page.placements) {
      const mod = byId.get(p.module);
      if (!mod?.island) continue;
      const on = effectiveSettings(mod, p.settings)[ISLAND_SETTING] === true;
      const counts = on && p.visible;
      rows.push({
        pageId: page.id,
        pageName: page.name,
        zoneId: p.id,
        module: mod.id,
        title: placementTitle(p),
        on,
        visible: p.visible,
        shadowed: counts && sending.has(mod.id),
      });
      if (counts) sending.add(mod.id);
    }
  }
  return rows;
}

/** The widgets with an island source that the profile does not place yet, by title. */
export function unplacedIslandWidgets(profile: MonitorProfile, modules: readonly DashboardModule[]): string[] {
  const placed = new Set(profile.pages.flatMap((pg) => pg.placements.map((p) => p.module)));
  return modules
    .filter((m) => m.island && !placed.has(m.id))
    .map((m) => m.title)
    .sort((a, b) => a.localeCompare(b));
}

/** Set one zone's setting on any page of a profile (the canvas may show another page). */
export function setZoneSetting(
  config: DashboardConfig,
  profileId: string,
  zoneId: string,
  key: string,
  value: ModuleSettingValue
): DashboardConfig {
  return {
    ...config,
    profiles: config.profiles.map((prof) =>
      prof.id !== profileId
        ? prof
        : {
            ...prof,
            pages: prof.pages.map((page) =>
              page.placements.some((p) => p.id === zoneId)
                ? {
                    ...page,
                    placements: page.placements.map((p) =>
                      p.id === zoneId ? { ...p, settings: { ...p.settings, [key]: value } } : p
                    ),
                  }
                : page
            ),
          }
    ),
  };
}

/** The inspector section holding a widget's "Send to island" (the jump target), if it has one. */
export function islandSectionId(mod: DashboardModule | undefined): string | undefined {
  if (!mod?.island) return undefined;
  return allSections(widgetContext(mod)).find((s) => s.settings.some((d) => d.key === ISLAND_SETTING))?.id;
}

/** The alert rules that show on this profile's island: display style Island (or the default), for this profile. */
export function islandRules(alerts: AlertsConfig, profileId: string): AlertRule[] {
  return alerts.rules.filter(
    (r) =>
      (r.outputs.display?.style ?? alerts.defaults.style) === "island" &&
      (!r.profiles || r.profiles.length === 0 || r.profiles.includes(profileId))
  );
}
