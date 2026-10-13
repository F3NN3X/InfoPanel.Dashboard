// Shared helpers of the registry groups: narrowing stored settings into widget props, and builders for
// the inspector schema (docs/redesign/phase9/brief-9.5-inspector.md).
import type { DeviceKind, ModuleSetting, ModuleSettings } from "@/modules/types";

/* ───────── stored settings → props ───────── */

/** The stored settings whose key equals a widget prop name, passed straight through (unset / empty = the widget's default). */
export const pass =
  <P extends object>(...keys: (keyof P & string)[]) =>
  (s: ModuleSettings): P =>
    Object.fromEntries(keys.filter((k) => s[k] !== undefined && s[k] !== "").map((k) => [k, s[k]])) as P;

/** The stored settings whose key is one of the widget's prop names, passed straight through (an empty string is kept). */
export const pick =
  <P extends object>(keys: readonly (keyof P & string)[]) =>
  (s: ModuleSettings): P =>
    Object.fromEntries(keys.filter((k) => s[k] !== undefined).map((k) => [k, s[k]])) as P;

/** A stored number, or undefined when unset or not numeric. */
export const numberOf = (v: unknown): number | undefined => (v === undefined || v === "" || v === null || !Number.isFinite(Number(v)) ? undefined : Number(v));
/** A stored value that is one of `allowed`, or undefined. */
export const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => allowed.find((a) => a === v);
/** A stored list, narrowed item by item; undefined when it is not a list. */
export const listOf = <T>(v: unknown, item: (x: unknown) => T | undefined): T[] | undefined =>
  Array.isArray(v) ? v.map(item).filter((x): x is T => x !== undefined) : undefined;
/** A stored non-empty string, or undefined. */
export const stringOf = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
/** A stored boolean, or undefined. */
export const boolOf = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

/** A comma-separated list ("" = none) as its trimmed items. */
export const splitKeys = (v: unknown): string[] => (typeof v === "string" && v ? v.split(",").map((k) => k.trim()).filter(Boolean) : []);
/** Items as a comma-separated string. */
export const joinKeys = (keys: readonly string[]): string => keys.join(",");
/** `keys` with `key` removed when present, else appended (the order is the binding order). */
export const toggleKey = (keys: readonly string[], key: string): string[] => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);

/* ───────── schema builders ───────── */

/** What a builder leaves to the caller: group, tab, advanced, hint, visibleIf, … */
type Extra = Partial<Omit<ModuleSetting, "key" | "label" | "type" | "default">>;
type Option = NonNullable<ModuleSetting["options"]>[number];

/** A select (a segmented control up to four options). */
export const enumSetting = (key: string, label: string, def: string, options: Option[], extra: Extra = {}): ModuleSetting => ({ key, label, type: "select", default: def, options, ...extra });

export const boolSetting = (key: string, label: string, def: boolean, extra: Extra = {}): ModuleSetting => ({ key, label, type: "boolean", default: def, ...extra });

export const numberSetting = (key: string, label: string, def: number, extra: Extra = {}): ModuleSetting => ({ key, label, type: "number", default: def, ...extra });

/** A text field. */
export const textSetting = (key: string, label: string, def = "", extra: Extra = {}): ModuleSetting => ({ key, label, type: "text", default: def, ...extra });

/** A colour; "" = the widget's own. Filed in Style, tucked away as advanced. */
export const colorSetting = (key: string, label: string, extra: Extra = {}): ModuleSetting => ({ key, label, type: "color", default: "", tab: "style", advanced: true, ...extra });

/** A bound sensor key ("" = none); `multiple` = ordered, comma-separated keys. On the Data tab. */
export const sensorSetting = (key: string, label: string, extra: Extra = {}): ModuleSetting => ({ key, label, type: "sensor", default: "", ...extra });

/** A device found in the live keys ("" = Auto). On the Data tab. */
export const deviceSetting = (key: string, label: string, from: DeviceKind, extra: Extra = {}): ModuleSetting => ({ key, label, type: "select", default: "", optionsFrom: from, ...extra });

/* ───────── flattened colour objects ───────── */

/** One entry of a `colors`-style prop object, stored as the colour setting `key` (reuse the legacy key where there is one). */
export interface ColorEntry {
  entry: string;
  key: string;
  label: string;
}

/** One colour setting per entry. */
export const colorSettings = (entries: readonly ColorEntry[], extra: Extra = {}): ModuleSetting[] => entries.map((e) => colorSetting(e.key, e.label, extra));

/** The prop object rebuilt from the stored entries; undefined when none is set (the widget's palette applies). */
export function colorsOf(s: ModuleSettings, entries: readonly ColorEntry[]): Record<string, string> | undefined {
  const set = entries.flatMap((e) => {
    const v = String(s[e.key] ?? "").trim();
    return v ? [[e.entry, v] as const] : [];
  });
  return set.length ? Object.fromEntries(set) : undefined;
}
