import { PROFILE_STYLE_SETTINGS, styleOf } from "@/modules/standard-settings";
import { settingKeys, type ModuleSettings } from "@/modules/types";
import type { BackgroundScope, PageBackground } from "./appearance";
import { presetTokens, type AppearancePreset } from "./appearance-presets";
import type { DashboardConfig, MonitorProfile, Placement } from "./layout";
import { allPlacements, mapPlacements } from "./pages";
import { followsGlobal, isEnforced } from "./style-resolve";
import { resolveTheme } from "./theme";

/**
 * Applying an appearance preset, and the widgets that would hide it.
 * Pure config → config; the studio sets each result in one call (one
 * undo step, no coalescing key).
 *
 * Scopes (the Appearance tab's switch):
 * - "All profiles": theme tokens + radius, `config.style` (replaced
 *   wholesale) and, see below, `config.background`.
 * - "This profile": the profile's own theme colours + radius
 *   (`MonitorProfile.theme` / `radius`, over the dashboard's), its
 *   `style` and `background`; other profiles keep theirs. Look keys the
 *   dashboard style sets but the preset doesn't are written as their
 *   defaults, so the profile shows the preset's look, not a blend.
 *
 * The background is written only when asked (`includeBackground`) or,
 * by default, when the scope has none yet; presets without one never
 * clear it. Content keys and widgets are never touched.
 */

export type PresetScope = BackgroundScope;

export interface ApplyOptions {
  /** Replace the scope's background with the preset's (default: only when it has none). */
  includeBackground?: boolean;
}

/** Whether a background shows nothing (unset, or media without a file or fill). */
function isEmptyBackground(bg: PageBackground | undefined, scope: PresetScope): boolean {
  if (!bg) return true;
  // A profile's "none" turns the dashboard's off on purpose; the dashboard's is just empty.
  if (bg.type === "none") return scope.kind === "all";
  return (bg.type === "image" || bg.type === "video") && !bg.src && !bg.color;
}

function nextBackground(
  current: PageBackground | undefined,
  preset: AppearancePreset,
  scope: PresetScope,
  options: ApplyOptions
): PageBackground | undefined {
  if (!preset.background) return current;
  const write = options.includeBackground ?? isEmptyBackground(current, scope);
  return write ? { ...preset.background } : current;
}

const LOOK_DEFAULTS: ModuleSettings = Object.fromEntries(
  PROFILE_STYLE_SETTINGS.flatMap((s) => settingKeys(s).map((key) => [key, s.default]))
);

/** A profile's style for a preset: the dashboard's keys it leaves unset reset to their defaults. */
function profileStyle(config: DashboardConfig, style: ModuleSettings): ModuleSettings {
  const shadowed = Object.keys(config.style ?? {}).filter((key) => !(key in style) && key in LOOK_DEFAULTS);
  return { ...Object.fromEntries(shadowed.map((key) => [key, LOOK_DEFAULTS[key]])), ...style };
}

const orNone = (style: ModuleSettings): ModuleSettings | undefined =>
  Object.keys(style).length > 0 ? style : undefined;

/** Apply a preset to a scope (see the module comment). */
export function applyAppearancePreset(
  config: DashboardConfig,
  preset: AppearancePreset,
  scope: PresetScope,
  options: ApplyOptions = {}
): DashboardConfig {
  const style = styleOf(preset.style);
  if (scope.kind === "all") {
    return {
      ...config,
      theme: { ...presetTokens(preset) },
      radius: preset.radius,
      style: orNone(style),
      background: nextBackground(config.background, preset, scope, options),
    };
  }
  return {
    ...config,
    profiles: config.profiles.map((p) =>
      p.id === scope.profileId
        ? {
            ...p,
            theme: { ...presetTokens(preset) },
            radius: preset.radius,
            style: orNone(profileStyle(config, style)),
            background: nextBackground(p.background, preset, scope, options),
          }
        : p
    ),
  };
}

/* ---------------- overrides ---------------- */

const inScope = (config: DashboardConfig, scope: PresetScope): MonitorProfile[] =>
  scope.kind === "all" ? config.profiles : config.profiles.filter((p) => p.id === scope.profileId);

/** A widget whose own look shows over the global style (it doesn't follow, nothing forces it). */
function hidesGlobal(p: Placement, enforced: boolean): boolean {
  return !followsGlobal(p.styleMode, enforced) && Object.keys(styleOf(p.settings)).length > 0;
}

/** The widgets in a scope whose own look hides the global style. */
export function countOverrides(config: DashboardConfig, scope: PresetScope): number {
  return inScope(config, scope).reduce((n, profile) => {
    const enforced = isEnforced(config, profile);
    return n + allPlacements(profile).filter((p) => hidesGlobal(p, enforced)).length;
  }, 0);
}

/** Whether a profile has its own look (style, theme colours or radius) over the dashboard's. */
const hasOwnLook = (p: MonitorProfile): boolean =>
  (p.style !== undefined && Object.keys(p.style).length > 0) || p.theme !== undefined || p.radius !== undefined;

/** "All profiles" only: the profiles whose own look overrides the dashboard's. */
export function countProfileOverrides(config: DashboardConfig, scope: PresetScope): number {
  if (scope.kind !== "all") return 0;
  return config.profiles.filter(hasOwnLook).length;
}

/**
 * Let the global style through: the overriding widgets follow it (their
 * own looks stay stored) and, for "All profiles", the profiles' own
 * styles, theme colours and radius are dropped.
 */
export function clearOverrides(config: DashboardConfig, scope: PresetScope): DashboardConfig {
  const ids = new Set(inScope(config, scope).map((p) => p.id));
  return {
    ...config,
    profiles: config.profiles.map((profile) => {
      if (!ids.has(profile.id)) return profile;
      const enforced = isEnforced(config, profile);
      const followed = mapPlacements(profile, (p) =>
        hidesGlobal(p, enforced) ? { ...p, styleMode: "follow" as const } : p
      );
      return scope.kind === "all"
        ? { ...followed, style: undefined, theme: undefined, radius: undefined }
        : followed;
    }),
  };
}

/* ---------------- the user's presets ---------------- */

/** The current look of a scope as a preset (the profile's own theme and style over the dashboard's). */
export function presetFromCurrent(
  config: DashboardConfig,
  scope: PresetScope,
  id: string,
  name: string
): AppearancePreset {
  const profile = scope.kind === "profile" ? config.profiles.find((p) => p.id === scope.profileId) : undefined;
  const style = styleOf({ ...config.style, ...profile?.style });
  const background = profile?.background ?? config.background;
  const theme = resolveTheme(config, profile);
  return {
    id,
    name,
    description: "Saved look",
    theme: { ...theme.tokens },
    radius: theme.radius,
    style,
    ...(background && !isEmptyBackground(background, { kind: "all" }) ? { background: { ...background } } : {}),
  };
}

export function saveAppearancePreset(
  config: DashboardConfig,
  scope: PresetScope,
  id: string,
  name: string
): DashboardConfig {
  const preset = presetFromCurrent(config, scope, id, name);
  return { ...config, appearancePresets: [...(config.appearancePresets ?? []), preset] };
}

export function renameAppearancePreset(config: DashboardConfig, id: string, name: string): DashboardConfig {
  return {
    ...config,
    appearancePresets: config.appearancePresets?.map((p) => (p.id === id ? { ...p, name } : p)),
  };
}

/** Delete a user preset; the last one leaves no list behind. */
export function deleteAppearancePreset(config: DashboardConfig, id: string): DashboardConfig {
  const rest = config.appearancePresets?.filter((p) => p.id !== id) ?? [];
  return { ...config, appearancePresets: rest.length > 0 ? rest : undefined };
}
