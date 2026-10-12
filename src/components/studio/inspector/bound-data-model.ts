import type { SensorValue } from "@/hooks/useSensors";
import { formatReading, searchPoints, type DataModel, type DataPoint } from "@/lib/data-points";
import type { UsageIndex } from "@/lib/data-usage";
import type { DashboardConfig, MonitorProfile, Placement } from "@/lib/layout";

/**
 * The Data tab's "Bound data" block and its picker (README §4.9), as data:
 * which points a zone reads, how to show their live value, and the picker's
 * results. Binding itself is `data-usage`'s `bindPoint` / `unbindPoint`.
 */

export interface BoundRow {
  key: string;
  /** The point in the Data API's catalog (missing: the API doesn't list it now). */
  point?: DataPoint;
  /** The panel widget that reads it (panel zones). */
  panelWidgetId?: string;
}

/**
 * The points a zone reads: a panel's widgets' sensors (also the ones the
 * Data API doesn't list right now), or the keys a widget zone claims.
 */
export function boundRows(zone: Placement, usage: UsageIndex, model: DataModel): BoundRow[] {
  if (zone.panel) {
    return zone.panel.widgets.flatMap((w) =>
      [...new Set([w.sensor, w.subSensor].filter((k): k is string => !!k))].map((key) => ({
        key,
        point: model.byKey.get(key),
        panelWidgetId: w.id,
      }))
    );
  }
  return (usage.byZone.get(zone.id) ?? []).map((key) => ({ key, point: model.byKey.get(key) }));
}

/** A live value as text; null when there is none ("No data"). */
export function liveText(live: SensorValue | undefined, point: DataPoint | undefined): string | null {
  if (live && typeof live.value === "number") return formatReading(live.value, live.unit);
  const text = live?.text?.trim();
  if (text) return text;
  return point && point.type !== "empty" && point.raw.trim() !== "" ? point.raw : null;
}

/** `Source · Container` under a row's name (the container only when it has one). */
export function pointPlace(point: DataPoint | undefined): string {
  if (!point) return "Not in the live sensor list";
  return point.containerTitle && point.containerTitle !== point.sourceName
    ? `${point.sourceName} · ${point.containerTitle}`
    : point.sourceName;
}

/** The picker shows this many results at most. */
export const PICKER_LIMIT = 80;

/** The picker's results: multi-word AND search, at most `PICKER_LIMIT`, and how many matched. */
export function pickerResults(points: readonly DataPoint[], query: string): { shown: DataPoint[]; total: number } {
  const matches = searchPoints(points, query);
  return { shown: matches.slice(0, PICKER_LIMIT), total: matches.length };
}

/**
 * A config edit (`bindPoint` / `unbindPoint`) as an edit of one profile,
 * for the studio's profile updater (one undo step).
 */
export function inProfile(
  config: DashboardConfig,
  fn: (config: DashboardConfig) => DashboardConfig
): (profile: MonitorProfile) => MonitorProfile {
  return (profile) => fn({ ...config, profiles: [profile] }).profiles[0] ?? profile;
}
