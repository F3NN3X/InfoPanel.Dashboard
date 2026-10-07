import type { SensorValue } from "@/hooks/useSensors";
import type { SensorMap } from "@/modules/types";

export interface KeyedSensor {
  key: string;
  sensor: SensorValue;
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
