import type { ApiSources } from "@/lib/catalog";
import { groupSources, type PluginGroup, type SourceEntry } from "@/lib/sources";
import type { SensorMap } from "@/modules/types";

/**
 * The Data Explorer's model of the Data API: `/api/sources` + one
 * `/api/sensors` snapshot normalised into Source → Container → Point, with
 * a type, unit and kind per point and a health per container and source.
 * Pure — the live values and history live in `data-live` / `sample-history`.
 */

export type PointType = "empty" | "url" | "list" | "bool" | "number" | "text";
export type Health = "ok" | "warn" | "off";
export type SourceCategory = "Built-in" | "Plugins" | "Hardware monitors" | "Pushed via API";

/** Category display order in the source tree. */
export const CATEGORIES: readonly SourceCategory[] = [
  "Built-in",
  "Plugins",
  "Hardware monitors",
  "Pushed via API",
];

export interface DataPoint {
  key: string;
  name: string;
  sourceId: string;
  sourceName: string;
  /** Unique across sources: `{sourceId}/{containerRawId}`. */
  containerId: string;
  /** The container's id as the Data API names it ("" for flat sources). */
  containerRawId: string;
  containerTitle: string;
  /** The value as text, as shown in the table ("26.2 %", "running"). */
  raw: string;
  type: PointType;
  /** The number behind a "number" point. */
  num: number | null;
  unit: string;
  /** What the unit measures (Temp, Clock, Power …), "" when unknown. */
  kind: string;
}

export interface DataContainer {
  id: string;
  title: string;
  sourceId: string;
  points: DataPoint[];
  status: Health;
}

export interface DataSource {
  id: string;
  name: string;
  category: SourceCategory;
  containers: DataContainer[];
  count: number;
  status: Health;
}

export interface DataModel {
  sources: DataSource[];
  points: DataPoint[];
  byKey: Map<string, DataPoint>;
}

const KIND: Record<string, string> = {
  "°C": "Temp",
  MHz: "Clock",
  "%": "Load",
  W: "Power",
  V: "Voltage",
  RPM: "Fan",
  "B/s": "Throughput",
  "KB/s": "Throughput",
  "MB/s": "Throughput",
  "GB/s": "Throughput",
  B: "Size",
  KB: "Size",
  MB: "Size",
  GB: "Size",
  FPS: "Frame rate",
  dB: "Level",
  ms: "Time",
  hPa: "Pressure",
  "m/s": "Speed",
  Hz: "Refresh",
  Mbps: "Link speed",
  hrs: "Duration",
  "mm/h": "Rate",
};

/** What a unit measures ("" for unknown units). */
export const kindOfUnit = (unit: string): string => KIND[unit.trim()] ?? "";

/** A number with an optional one-token unit ("26.2 °C", "480MB"); "12 GB free" is text. */
const NUMBER_WITH_UNIT = /^(-?\d+(?:\.\d+)?)(?:\s*([^\d\s]+))?$/;

/** Whether text is a JSON array or object ("[Unknown]" is not). */
function isJsonStructure(value: string): boolean {
  if (!/^[{[]/.test(value)) return false;
  try {
    return typeof JSON.parse(value) === "object";
  } catch {
    return false;
  }
}

interface Classified {
  type: PointType;
  num: number | null;
  unit: string;
}

/** Type a displayed value: empty, url, list, bool, number (+ unit) or text. */
export function classifyValue(raw: string): Classified {
  const value = raw.trim();
  if (value === "" || value === "-" || value === "—") return { type: "empty", num: null, unit: "" };
  if (/^https?:\/\//.test(value)) return { type: "url", num: null, unit: "" };
  if (value.includes("\n") || isJsonStructure(value)) return { type: "list", num: null, unit: "" };
  if (/^(true|false)$/i.test(value)) return { type: "bool", num: null, unit: "" };
  const m = NUMBER_WITH_UNIT.exec(value);
  if (m) return { type: "number", num: parseFloat(m[1]), unit: (m[2] ?? "").trim() };
  return { type: "text", num: null, unit: "" };
}

/** A point showing nothing useful: no value, or a number that is zero. */
export const isDeadPoint = (p: DataPoint): boolean => p.type === "empty" || p.num === 0;

/** off = no points; warn = every point empty or zero; otherwise ok. */
export function healthOf(points: readonly DataPoint[]): Health {
  if (points.length === 0) return "off";
  return points.every(isDeadPoint) ? "warn" : "ok";
}

/**
 * The tree category for a source id:
 * - `system` (the Data API's own bridge) → Built-in
 * - plugins from `/api/sources` → Plugins
 * - `libre` / `hwinfo` → Hardware monitors
 * - any other flat namespace (`spotify.*`, whatever a client POSTs to
 *   `/api/push`) → Pushed via API
 */
export function categoryOf(sourceId: string, isPlugin: boolean): SourceCategory {
  if (isPlugin) return "Plugins";
  if (sourceId === "system") return "Built-in";
  if (sourceId === "libre" || sourceId === "hwinfo") return "Hardware monitors";
  return "Pushed via API";
}

/** The displayed value and its parts, from an entry and its live reading. */
function describeEntry(entry: SourceEntry): Classified & { raw: string } {
  if (typeof entry.value === "number") {
    const unit = (entry.unit ?? "").trim();
    return { type: "number", num: entry.value, unit, raw: unit ? `${entry.value} ${unit}` : String(entry.value) };
  }
  const raw = (entry.text ?? "").trim();
  return { ...classifyValue(raw), raw };
}

/**
 * LibreHardwareMonitor / HWiNFO names repeat the device ("AMD Ryzen 9
 * 9950X3D Core #1" under the container "AMD Ryzen 9 9950X3D").
 */
function stripDevice(name: string, device: string): string {
  return device && name.startsWith(`${device} `) ? name.slice(device.length + 1) : name;
}

interface RawContainer {
  rawId: string;
  title: string;
  entries: SourceEntry[];
}

/**
 * A flat hardware monitor is one container in `groupSources`; split it into
 * one per device (the reading's `source`), when the stream names it.
 */
function deviceContainers(group: PluginGroup, sensors: SensorMap): RawContainer[] {
  const byDevice = new Map<string, SourceEntry[]>();
  for (const entry of group.sources.flatMap((s) => s.entries)) {
    const device = sensors[entry.key]?.source?.trim() || group.name;
    byDevice.set(device, [...(byDevice.get(device) ?? []), entry]);
  }
  return [...byDevice].map(([title, entries]) => ({ rawId: title, title, entries }));
}

function rawContainers(group: PluginGroup, category: SourceCategory, sensors: SensorMap): RawContainer[] {
  if (category === "Hardware monitors") return deviceContainers(group, sensors);
  return group.sources.map((s) => ({ rawId: s.id, title: s.label, entries: s.entries }));
}

function buildSource(group: PluginGroup, isPlugin: boolean, sensors: SensorMap): DataSource {
  const category = categoryOf(group.id, isPlugin);
  const strip = category === "Hardware monitors";
  const containers = rawContainers(group, category, sensors).map((c): DataContainer => {
    const containerId = `${group.id}/${c.rawId}`;
    const points = c.entries.map((entry): DataPoint => {
      const { raw, type, num, unit } = describeEntry(entry);
      return {
        key: entry.key,
        name: strip ? stripDevice(entry.label, c.title) : entry.label,
        sourceId: group.id,
        sourceName: group.name,
        containerId,
        containerRawId: c.rawId,
        containerTitle: c.title,
        raw,
        type,
        num,
        unit,
        kind: kindOfUnit(unit),
      };
    });
    return { id: containerId, title: c.title, sourceId: group.id, points, status: healthOf(points) };
  });
  const points = containers.flatMap((c) => c.points);
  return {
    id: group.id,
    name: group.name,
    category,
    containers,
    count: points.length,
    status: healthOf(points),
  };
}

/** Every source the Data API offers, as the explorer's tree and table read it. */
export function buildDataModel(sources: ApiSources | null, sensors: SensorMap): DataModel {
  const pluginIds = new Set((sources?.plugins ?? []).map((p) => p.id));
  const built = groupSources(sources, sensors).map((g) => buildSource(g, pluginIds.has(g.id), sensors));
  const order = (s: DataSource) => CATEGORIES.indexOf(s.category);
  const list = built.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
  const points = list.flatMap((s) => s.containers.flatMap((c) => c.points));
  return { sources: list, points, byKey: new Map(points.map((p) => [p.key, p])) };
}

/** Source counts per health, for the tree's chips. */
export function healthCounts(sources: readonly DataSource[]): Record<Health, number> {
  const counts: Record<Health, number> = { ok: 0, warn: 0, off: 0 };
  for (const s of sources) counts[s.status] += 1;
  return counts;
}

/** Lower-case and strip diacritics ("Écran" → "ecran"). */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Whether a point matches every word of the query (name, key, source, container, kind, value). */
export function matchesPoint(point: DataPoint, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(
    [point.name, point.key, point.sourceName, point.containerTitle, point.kind, point.raw].join("\n")
  );
  return words.every((w) => haystack.includes(w));
}

/** The points matching a multi-word AND query (all of them when blank). */
export function searchPoints(points: readonly DataPoint[], query: string): DataPoint[] {
  return query.trim() === "" ? [...points] : points.filter((p) => matchesPoint(p, query));
}
