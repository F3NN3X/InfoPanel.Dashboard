import {
  settingKeys,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
} from "@/modules/types";
import type { StyleSource } from "@/lib/style-resolve";

/** Lower-case and strip diacritics ("Écran" → "ecran"). */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Settings matching a search query by label, key, option label or keyword (case- and
 * diacritic-insensitive). Only when no setting matches that way does the
 * group name count, so "glow" finds the glow rows rather than the whole
 * "Border & effects" group, while "thresholds" still finds that group.
 * A blank query matches everything.
 */
export function filterSettings(defs: ModuleSetting[], query: string): ModuleSetting[] {
  const q = fold(query.trim());
  if (q === "") return defs;
  const direct = defs.filter((d) => rowMatches(d, query));
  return direct.length > 0 ? direct : defs.filter((d) => matchesQuery([d.group ?? ""], query));
}

/** Whether a setting's label, key, option labels or keywords match a query. */
export function rowMatches(def: ModuleSetting, query: string): boolean {
  return matchesQuery(
    [def.label, def.key, ...(def.options?.map((o) => o.label) ?? []), ...(def.keywords ?? [])],
    query
  );
}

/** Whether free text matches a search query (same folding as above). */
export function matchesQuery(texts: string[], query: string): boolean {
  const q = fold(query.trim());
  return q === "" || texts.some((text) => fold(text).includes(q));
}

/**
 * Where a setting's shown value comes from:
 * - `default` — nothing set (or this widget's value equals the default;
 *   a panel's legacy look counts as its default)
 * - `dashboard` — inherited from the dashboard style (all profiles)
 * - `profile` — inherited from the profile's style
 * - `own` — set on this widget
 * - `override` — set on this widget over an inherited value
 */
export type SettingState = "default" | "dashboard" | "profile" | "own" | "override";

/**
 * `inheritedFrom`: the layer of each inherited value (`resolveStyle`'s
 * `source`); unlisted inherited keys count as the profile's.
 */
export function settingState(
  key: string,
  own: ModuleSettings | undefined,
  inherited: ModuleSettings | undefined,
  fallback: ModuleSettingValue,
  inheritedFrom?: Record<string, StyleSource>
): SettingState {
  const from = inheritedFrom?.[key] ?? "profile";
  const hasOwn = own?.[key] !== undefined;
  const hasInherited = inherited?.[key] !== undefined && from !== "default";
  if (hasOwn && hasInherited) return "override";
  if (hasInherited) return from === "dashboard" ? "dashboard" : "profile";
  if (hasOwn && own?.[key] !== fallback) return "own";
  return "default";
}

const STATE_RANK: Record<SettingState, number> = { default: 0, dashboard: 1, profile: 2, own: 3, override: 4 };

/** `settingState` over every key a setting stores (the strongest one wins). */
export function settingStateOf(
  def: ModuleSetting,
  own: ModuleSettings | undefined,
  inherited: ModuleSettings | undefined,
  inheritedFrom?: Record<string, StyleSource>
): SettingState {
  return settingKeys(def)
    .map((key) => settingState(key, own, inherited, def.default, inheritedFrom))
    .reduce((a, b) => (STATE_RANK[b] > STATE_RANK[a] ? b : a), "default" as SettingState);
}

/** A settings map without the given keys (`undefined` when nothing is left). */
export function dropKeys(
  settings: ModuleSettings | undefined,
  keys: ReadonlySet<string>
): ModuleSettings | undefined {
  const rest = Object.entries(settings ?? {}).filter(([key]) => !keys.has(key));
  return rest.length > 0 ? Object.fromEntries(rest) : undefined;
}
