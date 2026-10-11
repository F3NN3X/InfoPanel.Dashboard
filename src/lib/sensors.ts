import type { SensorValue } from "@/hooks/useSensors";
import type { SensorMap } from "@/modules/types";

export interface KeyedSensor {
  key: string;
  sensor: SensorValue;
}

/**
 * Binding key for the yr plugin's forecast, whose location slug differs per
 * user: resolved to the first `plugins.yr-weather-plugin.<slug>.forecast`.
 */
export const YR_FORECAST_KEY = "plugins.yr-weather-plugin.*.forecast";
/** The key prefix the placeholder resolves under. */
export const YR_FORECAST_PREFIX = "plugins.yr-weather-plugin.";
export const YR_FORECAST_RE = /^plugins\.yr-weather-plugin\.[^.]+\.forecast$/;

/** `sensors[key]`, resolving the YR_FORECAST_KEY placeholder. */
export function sensorAt(
  sensors: SensorMap,
  key: string
): SensorValue | undefined {
  if (key !== YR_FORECAST_KEY) return sensors[key];
  const found = Object.keys(sensors).find((k) => YR_FORECAST_RE.test(k));
  return found ? sensors[found] : undefined;
}

/** Sensor for `prefix + container + "." + entry`, or undefined. */
export function entry(
  sensors: SensorMap,
  prefix: string,
  container: string,
  id: string
): SensorValue | undefined {
  return sensors[`${prefix}${container}.${id}`];
}

/** First sensor under `prefix` whose entry id equals `id` (dynamic containers). */
export function findEntry(
  sensors: SensorMap,
  prefix: string,
  id: string
): KeyedSensor | undefined {
  const suffix = `.${id}`;
  for (const key of Object.keys(sensors)) {
    if (key.startsWith(prefix) && key.endsWith(suffix)) {
      return { key, sensor: sensors[key] };
    }
  }
  return undefined;
}

/** Sensors under `prefix` grouped by container id (segment right after the prefix). */
export function groupByContainer(
  sensors: SensorMap,
  prefix: string
): Map<string, KeyedSensor[]> {
  const groups = new Map<string, KeyedSensor[]>();
  for (const key of Object.keys(sensors)) {
    if (!key.startsWith(prefix)) continue;
    const container = key.slice(prefix.length).split(".")[0];
    const list = groups.get(container) ?? [];
    list.push({ key, sensor: sensors[key] });
    groups.set(container, list);
  }
  return groups;
}

/** Sensor within a container group by its display name. */
export function byName(
  items: KeyedSensor[],
  name: string
): SensorValue | undefined {
  return items.find((i) => i.sensor.name === name)?.sensor;
}

/**
 * Sensor within a container group by its entry id (the last key segment,
 * e.g. `audio-level` / `device-name`). Some plugins (the AudioLevelMeter)
 * embed the device name in the display name and use stable key suffixes,
 * so matching the suffix is the robust lookup.
 */
export function bySuffix(
  items: KeyedSensor[],
  id: string
): SensorValue | undefined {
  const suffix = `.${id}`;
  return items.find((i) => i.key.endsWith(suffix))?.sensor;
}

/**
 * Resolve a container entry by key suffix, falling back to a legacy plain
 * display name (older plugin builds that named entries "Level", "Peak", …).
 */
export function bySuffixOrName(
  items: KeyedSensor[],
  id: string,
  legacyName?: string
): SensorValue | undefined {
  return bySuffix(items, id) ?? (legacyName ? byName(items, legacyName) : undefined);
}

/** Text value, with plugin placeholders ("-", "") treated as no value. */
export function liveText(s: SensorValue | undefined): string | undefined {
  if (!s?.text) return undefined;
  const t = s.text.trim();
  return t === "-" ? undefined : t;
}

/** Numeric value, treating 0 as "not live" (sensor default). */
export function liveValue(s: SensorValue | undefined): number | undefined {
  if (s?.value === undefined || s.value === 0) return undefined;
  return s.value;
}
