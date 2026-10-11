import {
  GROUP_COLORS,
  GROUP_EFFECTS,
  GROUP_SIZE,
  GROUP_SPACING,
  GROUP_TITLE,
  PROFILE_STYLE_KEYS,
  STANDARD_SETTINGS,
} from "@/modules/standard-settings";
import {
  settingKeys,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
} from "@/modules/types";

/**
 * The look keys: everything a profile can style plus the rest of the
 * standard block (preset, layout, title, icon, background image).
 */
const STYLE_KEYS: ReadonlySet<string> = new Set([
  ...PROFILE_STYLE_KEYS,
  ...STANDARD_SETTINGS.flatMap(settingKeys),
]);

/** The standard style groups; module settings filed there are look too. */
const STYLE_GROUPS: ReadonlySet<string> = new Set([
  GROUP_TITLE,
  GROUP_SIZE,
  GROUP_SPACING,
  GROUP_COLORS,
  GROUP_EFFECTS,
]);

/**
 * Whether a setting belongs on the inspector's Style tab: a standard look
 * key, or a module setting in one of the standard style groups (e.g. a
 * per-element color under "Colors & type"). Everything else is content.
 */
export function isStyleSetting(def: ModuleSetting): boolean {
  return STYLE_KEYS.has(def.key) || (def.group !== undefined && STYLE_GROUPS.has(def.group));
}

/** A module's settings split into the Content and Style tabs, order kept. */
export function splitSettings(defs: ModuleSetting[]): {
  content: ModuleSetting[];
  style: ModuleSetting[];
} {
  return {
    content: defs.filter((d) => !isStyleSetting(d)),
    style: defs.filter(isStyleSetting),
  };
}

/** Lower-case and strip diacritics ("Écran" → "ecran"). */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Settings matching a search query by label, key, option label or keyword (case- and
 * diacritic-insensitive). Only when no setting matches that way does the
 * group name count, so "glow" finds the glow rows rather than the whole
 * "Border, glow & CSS" group, while "thresholds" still finds that group.
 * A blank query matches everything.
 */
export function filterSettings(defs: ModuleSetting[], query: string): ModuleSetting[] {
  const q = fold(query.trim());
  if (q === "") return defs;
  const hit = (texts: string[]) => texts.some((text) => fold(text).includes(q));
  const direct = defs.filter((d) =>
    hit([d.label, d.key, ...(d.options?.map((o) => o.label) ?? []), ...(d.keywords ?? [])])
  );
  return direct.length > 0 ? direct : defs.filter((d) => hit([d.group ?? ""]));
}

/** Whether free text matches a search query (same folding as above). */
export function matchesQuery(texts: string[], query: string): boolean {
  const q = fold(query.trim());
  return q === "" || texts.some((text) => fold(text).includes(q));
}

/**
 * Where a setting's shown value comes from:
 * - `default` — nothing set (or this widget's value equals the default)
 * - `profile` — inherited from the profile's style
 * - `own` — set on this widget
 * - `override` — set on this widget over a profile style value
 */
export type SettingState = "default" | "profile" | "own" | "override";

export function settingState(
  key: string,
  own: ModuleSettings | undefined,
  inherited: ModuleSettings | undefined,
  fallback: ModuleSettingValue
): SettingState {
  const hasOwn = own?.[key] !== undefined;
  const hasInherited = inherited?.[key] !== undefined;
  if (hasOwn && hasInherited) return "override";
  if (hasInherited) return "profile";
  if (hasOwn && own?.[key] !== fallback) return "own";
  return "default";
}

const STATE_RANK: Record<SettingState, number> = { default: 0, profile: 1, own: 2, override: 3 };

/** `settingState` over every key a setting stores (the strongest one wins). */
export function settingStateOf(
  def: ModuleSetting,
  own: ModuleSettings | undefined,
  inherited: ModuleSettings | undefined
): SettingState {
  return settingKeys(def)
    .map((key) => settingState(key, own, inherited, def.default))
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
