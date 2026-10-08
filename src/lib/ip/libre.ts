import type { SensorMap } from "@/modules/types";
import type { SensorValue } from "@/hooks/useSensors";
import type { IPSensorBinding } from "./types";

/**
 * Sensor resolution — maps InfoPanel sensor ids to this bridge's live keys.
 *
 * - Plugin ids: `/Plugin/container/entry` → `plugins.Plugin.container.entry`.
 * - Libre ids: `/container/instance/type/index` → the live `libre.*` key
 *   whose display name matches (the bridge keys Libre sensors by name, so
 *   device-specific keys are found without hardcoding device names).
 */

/** Plugin id → bridge key. */
export function pluginKey(pluginId: string): string {
  return "plugins." + pluginId.replace(/^\/+/, "").replace(/\//g, ".");
}

interface LibreTarget {
  /** Case-insensitive exact display-name match. */
  name?: string;
  /** Case-insensitive suffix match (name ends with this). */
  suffix?: string;
  /** Derived value: numerator/denominator (by display name), × factor. */
  derived?: { num: string; den: string; factor?: number };
}

/**
 * Known Libre sensor ids → display-name targets. Covers the arcv2 profile's
 * bindings plus the common LibreHardwareMonitor names. The NIC ids use the
 * machine-specific GUID — only the last two path segments matter here.
 */
const LIBRE_TARGETS: Array<[RegExp, LibreTarget]> = [
  [/(^|\/)amdcpu\/\d+\/load\/0$/, { name: "CPU Total" }],
  [/(^|\/)amdcpu\/\d+\/power\/\d+$/, { name: "Package Power" }],
  [/(^|\/)amdcpu\/\d+\/temperature\/\d+$/, { suffix: "Tctl/Tdie" }],
  [/(^|\/)cpu\/\d+\/load\/0$/, { name: "CPU Total" }],
  [/(^|\/)cpu\/\d+\/temperature\/0$/, { name: "Core (Tctl/Tdie)" }],
  [/(^|\/)gpu-nvidia\/\d+\/load\/0$/, { name: "GPU Core" }],
  [/(^|\/)gpu-nvidia\/\d+\/load\/1$/, { name: "GPU Core Clock" }],
  [/(^|\/)gpu-nvidia\/\d+\/load\/3$/, { name: "GPU Memory Used" }],
  [/(^|\/)gpu-nvidia\/\d+\/temperature\/0$/, { name: "GPU Temperature" }],
  [/(^|\/)gpu-nvidia\/\d+\/temperature\/3$/, { name: "GPU Memory Junction" }],
  [/(^|\/)gpu-nvidia\/\d+\/power\/\d+$/, { name: "GPU Power" }],
  [/(^|\/)gpu-nvidia\/\d+\/fan\/(\d+)$/, { suffix: "GPU Fan" }],
  [/(^|\/)gpu-amd\/\d+\/load\/0$/, { name: "GPU Core" }],
  [/(^|\/)gpu-amd\/\d+\/temperature\/0$/, { name: "GPU Temperature" }],
  [/(^|\/)lpc\/nct6701d\/\d+\/fan\/(\d+)$/, { suffix: "Fan #" }],
  [/(^|\/)lpc\/\w+\/\d+\/fan\/(\d+)$/, { suffix: "Fan #" }],
  [/(^|\/)memory\/dimm\/(\d+)\/temperature\/\d+$/, { suffix: "DIMM #" }],
  [/^\/ram\/load\/0$/, {
    derived: { num: "Total Memory Memory Used", den: "Total Memory Memory", factor: 100 },
  }],
  [/^\/ram\/data\/0$/, { name: "Total Memory Memory Used" }],
  [/^\/ram\/data\/1$/, { name: "Total Memory Memory Available" }],
  // NIC throughput — machine-specific GUID, match by display name.
  [/^\/nic\/[^/]+\/throughput\/7$/, { name: "Ethernet Upload Speed" }],
  [/^\/nic\/[^/]+\/throughput\/8$/, { name: "Ethernet Download Speed" }],
];

/** Display-name → bridge key index, rebuilt from a live snapshot. */
function nameIndex(sensors: SensorMap): Map<string, string> {
  const idx = new Map<string, string>();
  for (const [key, s] of Object.entries(sensors)) {
    if (key.startsWith("libre.") && s.name) {
      idx.set(s.name.toLowerCase(), key);
    }
  }
  return idx;
}

/** Resolve a Libre id to a live bridge key (exact name first, then suffix/numbered). */
export function resolveLibreKey(
  sensors: SensorMap,
  libreId: string
): string | undefined {
  const target = LIBRE_TARGETS.find(([re]) => re.test(libreId))?.[1];
  if (!target) return undefined;
  const idx = nameIndex(sensors);

  if (target.name && idx.has(target.name.toLowerCase())) {
    return idx.get(target.name.toLowerCase());
  }
  if (target.suffix) {
    // Recover the trailing number (fan index, DIMM index, …) when present.
    const m = libreId.match(/(\d+)$/);
    const suffix = m ? `${target.suffix.trim()}${m[1]}`.trim() : target.suffix.trim();
    const suffixLower = suffix.toLowerCase();
    for (const [name, key] of idx) {
      if (name.endsWith(suffixLower)) return key;
    }
  }
  return undefined;
}

/** Resolve a binding to a live bridge key. */
export function resolveBindingKey(
  sensors: SensorMap,
  b: IPSensorBinding
): string | undefined {
  // Editor-picked live key — always wins.
  if (b.bridgeKey && b.bridgeKey in sensors) return b.bridgeKey;
  if (b.sensorType === "plugin" && b.pluginId) {
    const key = pluginKey(b.pluginId);
    if (key in sensors) return key;
    // Fuzzy: container prefix (e.g. /yr-weather-plugin/brevik/… → brevik-norway).
    const parts = key.split(".");
    if (parts.length >= 3) {
      const prefix = parts[0] + "." + parts[1] + ".";
      for (const k of Object.keys(sensors)) {
        if (k.startsWith(prefix) && k.endsWith("." + parts.slice(2).join("."))) return k;
      }
    }
    return undefined;
  }
  if (b.sensorType === "libre" && b.libreId) {
    return resolveLibreKey(sensors, b.libreId);
  }
  return undefined;
}

/** The live bridge sensor value for a binding (undefined when absent). */
export function liveSensor(
  sensors: SensorMap,
  b: IPSensorBinding
): SensorValue | undefined {
  const key = resolveBindingKey(sensors, b);
  if (!key) return undefined;
  return sensors[key];
}

/**
 * Live value for a binding (applies derived ratios), with an optional
 * MIN/MAX/AVERAGE selection from the sensor's rolling stats.
 */
export function bindingValue(
  sensors: SensorMap,
  b: IPSensorBinding
): number | undefined {
  // Derived (e.g. RAM %): computed from two named sensors.
  const libreId = b.libreId;
  const target = libreId
    ? LIBRE_TARGETS.find(([re]) => re.test(libreId))?.[1]
    : undefined;
  if (target?.derived) {
    const idx = nameIndex(sensors);
    const num = idx.get(target.derived.num.toLowerCase());
    const den = idx.get(target.derived.den.toLowerCase());
    if (!num || !den) return undefined;
    const n = sensors[num]?.value ?? 0;
    const d = sensors[den]?.value ?? 0;
    if (d === 0) return undefined;
    return (n / d) * (target.derived.factor ?? 1);
  }

  const key = resolveBindingKey(sensors, b);
  if (!key) return undefined;
  const s: SensorValue | undefined = sensors[key];
  if (!s) return undefined;
  switch (b.valueType) {
    case "MIN":
      return s.min ?? s.value;
    case "MAX":
      return s.max ?? s.value;
    case "AVERAGE":
      return s.avg ?? s.value;
    default:
      return s.value;
  }
}

/** Live text value for a binding (tables, URLs, text sensors). */
export function bindingText(
  sensors: SensorMap,
  b: IPSensorBinding
): string | undefined {
  const key = resolveBindingKey(sensors, b);
  if (!key) return undefined;
  const s = sensors[key];
  if (!s?.text) return undefined;
  const t = s.text.trim();
  return t === "-" ? undefined : t;
}
