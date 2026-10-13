// The hardware readings of the Data API (`libre.*` and `hwinfo.*`), found without a fixed key list:
// SensorGroup lists them, Thermals draws the temperatures as gauges.
import { get, num, pretty, sensorLabel, type Data } from "./kit";

export type ReadingKind = "temp" | "fan" | "power" | "other";

export interface Reading {
  /** The sensor key: unique, so it keys the row. */
  key: string;
  label: string;
  /** The value with its unit, a plain number rounded to one decimal. */
  text: string;
  value: number;
  unit: string;
  kind: ReadingKind;
}

const RANK: Record<ReadingKind, number> = { temp: 0, fan: 1, power: 2, other: 3 };

/** Classify a reading by its name and unit. */
export function kindOf(name: string, unit: string): ReadingKind {
  const t = `${name} ${unit}`.toLowerCase();
  if (/fan|rpm/.test(t)) return "fan";
  if (/watt|power|\bw\b/.test(t)) return "power";
  if (/temp|°c|celsius/.test(t)) return "temp";
  return "other";
}

/**
 * Every live `libre.*` / `hwinfo.*` reading (empty and numeric-zero values are skipped), temperatures
 * first, then fans, power and the rest in the order the API lists them. A row is labelled with the
 * sensor's display name when `names` has one, else with its key prettified.
 */
export function readings(data: Data | undefined, names?: Record<string, string>): Reading[] {
  const out: Reading[] = [];
  for (const key of Object.keys(data ?? {})) {
    if (!key.startsWith("libre.") && !key.startsWith("hwinfo.")) continue;
    const raw = get(data, key);
    const value = num(raw);
    if (raw === "" || (Number.isFinite(value) && value === 0)) continue;
    const unit = Number.isFinite(value) ? raw.replace(/^[-\d.,\s]+/, "").trim() : "";
    // a plain number (`58.88671875 °C`) is shown to one decimal, as the legacy list did
    const text = /^-?\d+(\.\d+)?(\s|$)/.test(raw) ? `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}` : raw;
    const label = sensorLabel(key, names, pretty(key.replace(/^(libre|hwinfo)\./, "")).replace(/ {2,}/g, " "));
    out.push({ key, label, text, value, unit, kind: kindOf(label, unit) });
  }
  return out.sort((a, b) => RANK[a.kind] - RANK[b.kind]);
}
