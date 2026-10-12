// The hardware readings of the Data API (`libre.*` and `hwinfo.*`), found without a fixed key list:
// SensorGroup lists them, Thermals draws the temperatures as gauges.
import { get, num, pretty, type Data } from "./kit";

export type ReadingKind = "temp" | "fan" | "power" | "other";

export interface Reading {
  /** The sensor key: unique, so it keys the row. */
  key: string;
  label: string;
  /** The value as the API reports it, with its unit. */
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
 * first, then fans, power and the rest in the order the API lists them.
 */
export function readings(data: Data | undefined): Reading[] {
  const out: Reading[] = [];
  for (const key of Object.keys(data ?? {})) {
    if (!key.startsWith("libre.") && !key.startsWith("hwinfo.")) continue;
    const text = get(data, key);
    const value = num(text);
    if (text === "" || (Number.isFinite(value) && value === 0)) continue;
    const unit = Number.isFinite(value) ? text.replace(/^[-\d.,\s]+/, "").trim() : "";
    const label = pretty(key.replace(/^(libre|hwinfo)\./, "")).replace(/ {2,}/g, " ");
    out.push({ key, label, text, value, unit, kind: kindOf(label, unit) });
  }
  return out.sort((a, b) => RANK[a.kind] - RANK[b.kind]);
}
