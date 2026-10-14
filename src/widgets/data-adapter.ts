// The bridge from the app's sensor map to the flat string data the widget templates read.
// The stream itself is the app's (`useSensors` / `lib/sensor-store.ts`); nothing here opens another.
import { resolveImageUrl } from "@/lib/image";
import type { SensorMap } from "@/modules/types";

/** `{ key: "62.5 %" }`: what the templates' `num()` / `get()` parse. */
export type FlatData = Record<string, string>;

const cache = new WeakMap<SensorMap, FlatData>();

// A hardware power, temperature or clock that has read 0 since the source started (min and max 0 too)
// has never reported: the source cannot read it (no hardware access), so it shows as "–", not a real 0.
// Hardware keys only: a plugin's 0 °C (the weather) is real, and plugins report 0 as their range too.
const NEVER_ZERO_UNITS = new Set(["W", "°C", "MHz"]);
/** True for a hardware reading that has never reported (see `NEVER_ZERO_UNITS`). */
export const neverReported = (key: string, s: SensorMap[string]): boolean =>
  /^(libre|hwinfo)\./.test(key) && s.value === 0 && s.max === 0 && (s.min ?? 0) === 0 && NEVER_ZERO_UNITS.has(s.unit ?? "");

/**
 * The map as flat strings: `text` when present and non-empty, else the number followed by a space
 * and its unit (the number alone for an empty unit). A key with neither text nor a finite value is
 * left out, so `get()` falls back and `num()` is NaN; so is a reading that has never reported
 * (`neverReported`). Memoised per map identity.
 */
export function toFlat(map: SensorMap): FlatData {
  const hit = cache.get(map);
  if (hit) return hit;
  const flat: FlatData = {};
  for (const [key, s] of Object.entries(map)) {
    if (s.text != null && s.text !== "") flat[key] = s.text;
    else if (typeof s.value === "number" && Number.isFinite(s.value) && !neverReported(key, s)) flat[key] = s.unit ? `${s.value} ${s.unit}` : String(s.value);
  }
  cache.set(map, flat);
  return flat;
}

/** `{ key: "CPU Package Temp" }`: the sensors' display names, for the keys that have one. */
export type FlatNames = Record<string, string>;

const nameCache = new WeakMap<SensorMap, FlatNames>();

/** The display names of the map (`SensorValue.name`, blanks left out). Memoised per map identity, like `toFlat`. */
export function toNames(map: SensorMap): FlatNames {
  const hit = nameCache.get(map);
  if (hit) return hit;
  const names: FlatNames = {};
  for (const [key, s] of Object.entries(map)) if (s.name?.trim()) names[key] = s.name.trim();
  nameCache.set(map, names);
  return names;
}

/** An image value for `<img src>`: Data API paths (`/api/images/...`) resolve against the API. */
export function widgetImage(src: string | undefined): string | undefined {
  return src ? resolveImageUrl(src) : undefined;
}
