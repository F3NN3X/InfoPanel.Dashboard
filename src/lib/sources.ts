import type { SensorValue } from "@/hooks/useSensors";
import type { SensorMap } from "@/modules/types";

/**
 * The dashboard's view of "sources" — every plugin the host is exposing,
 * and the containers (a.k.a. sources) each plugin pushes. Derived live from
 * the sensor map the bridge already streams, so the studio's Sources view
 * always reflects what is actually available (no host-side registry needed).
 *
 * Key shape:
 *   plugins.{plugin}.{container}.{entry...}  — a plugin's per-source entries
 *   {prefix}.{...}                           — flat value sources (libre.*,
 *                                              system.*, spotify.*, hwinfo.*)
 */

export interface SourceEntry {
  /** Full sensor key. */
  key: string;
  /** Entry id (last key segment) or the flat remainder. */
  id: string;
  /** Human label (the entry's display name, de-noised). */
  label: string;
  value?: number;
  text?: string;
  unit?: string;
}

export interface SourceInfo {
  /** Container id ("" for flat, non-plugin sources). */
  id: string;
  /** Owning plugin id. */
  pluginId: string;
  /** Friendly display name for this source. */
  label: string;
  entries: SourceEntry[];
}

export interface PluginGroup {
  id: string;
  name: string;
  sources: SourceInfo[];
}

/** Known plugin ids → friendly names (the rest are pretty-printed). */
const PLUGIN_NAMES: Record<string, string> = {
  "audio-level-meter": "Audio Level Meter",
  "clock-plugin": "Clock",
  "drive-info-plugin": "Drive Info",
  "media-plugin": "Media",
  "network-info-plugin": "Network",
  "spotify-plugin": "Spotify",
  "system-info-plugin": "System Info",
  "volume-plugin": "Volume",
  "weather-plugin": "Weather",
  "yr-weather-plugin": "yr Weather",
  InfoPanel: "InfoPanel",
  "InfoPanel.RTSS": "RTSS (FPS)",
  "InfoPanel.SteamAPI": "Steam",
  "InfoPanel.Media": "Media",
  "InfoPanel.Spotify": "Spotify",
  "InfoPanel.VBZ": "VBZ",
  "InfoPanel.Notifications": "Notifications",
  libre: "Hardware (Libre)",
  system: "System (Bridge)",
  spotify: "Spotify (legacy)",
  hwinfo: "HWiNFO",
};

function pretty(id: string): string {
  return id
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function pluginName(id: string): string {
  return PLUGIN_NAMES[id] ?? pretty(id);
}

/** Strip the plugin's decoration (a leading "🎵" glyph + trailing "· Entry"). */
export function sourceLabel(sensor: SensorValue, key: string): string {
  let n = sensor.name?.trim() ?? "";
  if (n) {
    // Drop a leading decorative glyph (e.g. "🎵 ") and a trailing "· Entry".
    n = n.replace(/^\p{Extended_Pictographic}\s*/u, "");
    n = n.replace(/\s·\s[^·]*$/u, "");
  }
  return n || key;
}

function splitKey(key: string): { plugin: string; container: string; entry: string } {
  if (key.startsWith("plugins.")) {
    const parts = key.split(".");
    return {
      plugin: parts[1],
      container: parts[2] ?? "",
      entry: parts.slice(3).join("."),
    };
  }
  const parts = key.split(".");
  return { plugin: parts[0], container: "", entry: parts.slice(1).join(".") };
}

/**
 * A friendly name for one source (container). Prefers the plugin's own
 * `device-name` entry, then a de-noised entry display name, then the raw id.
 */
export function containerLabel(
  sensors: SensorMap,
  plugin: string,
  container: string
): string {
  if (!container) return pluginName(plugin);
  const devName = sensors[`plugins.${plugin}.${container}.device-name`]?.text;
  if (devName && devName.trim() && devName.trim() !== "-") return devName.trim();
  if (container === "default-audio") return "Default device";
  // Fall back to the de-noised display name of the first entry.
  for (const key of Object.keys(sensors)) {
    if (key === `plugins.${plugin}.${container}`) continue;
    if (key.startsWith(`plugins.${plugin}.${container}.`)) {
      return sourceLabel(sensors[key], key);
    }
  }
  return container;
}

/** Group every live sensor into plugins → sources → entries. */
export function groupSources(sensors: SensorMap): PluginGroup[] {
  const byPlugin = new Map<string, Map<string, SourceEntry[]>>();

  for (const key of Object.keys(sensors)) {
    const s = sensors[key];
    const { plugin, container, entry } = splitKey(key);
    const plugins = byPlugin.get(plugin) ?? new Map<string, SourceEntry[]>();
    const entries = plugins.get(container) ?? [];
    entries.push({
      key,
      id: entry || container || key,
      label: sourceLabel(s, key),
      value: s.value,
      text: s.text,
      unit: s.unit,
    });
    plugins.set(container, entries);
    byPlugin.set(plugin, plugins);
  }

  const groups: PluginGroup[] = [];
  for (const [plugin, containers] of [...byPlugin.entries()].sort((a, b) =>
    pluginName(a[0]).localeCompare(pluginName(b[0]))
  )) {
    const sources: SourceInfo[] = [...containers.entries()]
      .map(([id, entries]) => ({
        id,
        pluginId: plugin,
        label: containerLabel(sensors, plugin, id),
        // Keep the plugin's own ordering stable: name first, then key.
        entries: [...entries].sort((a, b) =>
          a.id.localeCompare(b.id)
        ),
      }))
      .sort((a, b) => {
        // Flat (containerless) sources sort by their label; containers put
        // "default"/"all" first, then alphabetical.
        if (!a.id && !b.id) return a.label.localeCompare(b.label);
        if (a.id === "default-audio" && b.id !== "default-audio") return -1;
        if (b.id === "default-audio" && a.id !== "default-audio") return 1;
        return a.label.localeCompare(b.label);
      });
    groups.push({ id: plugin, name: pluginName(plugin), sources });
  }
  return groups;
}

export interface SourceOption {
  value: string;
  label: string;
}

/**
 * Options for a widget's "source" select: "all sources" plus one entry per
 * container the given plugin currently exposes. Used by the schema's
 * dynamic `optionsFrom: "sources"` setting type.
 */
export function sourceOptions(
  sensors: SensorMap,
  prefix: string
): SourceOption[] {
  const opts: SourceOption[] = [{ value: "", label: "All sources" }];
  const base = prefix.startsWith("plugins.")
    ? prefix.slice("plugins.".length)
    : prefix;
  const contPrefix = prefix.startsWith("plugins.")
    ? `plugins.${base}.`
    : `${prefix}.`;
  const seen = new Set<string>();
  for (const key of Object.keys(sensors)) {
    if (!key.startsWith(contPrefix)) continue;
    const container = key
      .slice(contPrefix.length)
      .split(".")[0];
    if (container && !seen.has(container)) {
      seen.add(container);
      opts.push({
        value: container,
        label: containerLabel(sensors, base, container),
      });
    }
  }
  return opts;
}
