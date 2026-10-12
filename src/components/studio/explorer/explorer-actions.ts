import type { DataPoint } from "@/lib/data-points";
import { newPanel, uid, type DashboardConfig, type Widget } from "@/lib/layout";
import type { PanelPreset } from "@/lib/panelPresets";
import { addPresetPlacement } from "../studio-actions";

/** The panel preset behind "New widget from this value": one stat bound to the point. */
export function statPreset(point: DataPoint): PanelPreset {
  return {
    id: "explorer-stat",
    title: point.name,
    colSpan: 2,
    rowSpan: 1,
    make: () => {
      const panel = newPanel(point.name);
      const stat: Widget = {
        id: uid("w"),
        kind: "stat",
        label: point.name,
        sensor: point.key,
        visible: true,
      };
      return { ...panel, widgets: [stat] };
    },
  };
}

/** Add a panel zone with one stat bound to `point` to the profile; returns the new zone's id. */
export function addStatZone(
  config: DashboardConfig,
  profileId: string,
  point: DataPoint,
  zoneId: string
): DashboardConfig {
  return {
    ...config,
    profiles: config.profiles.map((p) =>
      p.id === profileId ? addPresetPlacement(p, zoneId, statPreset(point)) : p
    ),
  };
}
