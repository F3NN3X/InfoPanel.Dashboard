import type { BackgroundScope } from "@/lib/appearance";
import { presetTokens, type AppearancePreset } from "@/lib/appearance-presets";
import type { DashboardConfig, MonitorProfile, Placement } from "@/lib/layout";
import type { StyleMode } from "@/lib/style-resolve";
import type { ThemeTokens } from "@/lib/theme";
import type { ModuleSettings } from "@/modules/types";
import { setProfileStyle } from "./studio-actions";

/**
 * Edits of the global style: the dashboard's ("All profiles") or a
 * profile's style and force switch, and the widgets' follow / custom
 * choice. Pure config → config updates, each one undo step (same-key
 * edits coalesce: `appearance-style:<scope>`, `style-enforce:<scope>`).
 */

/** Which global style an edit targets (the page background's scopes). */
export type StyleScope = BackgroundScope;

const scopeId = (scope: StyleScope) => (scope.kind === "all" ? "all" : scope.profileId);

/** Undo-coalescing key for style edits in a scope. */
export const styleKey = (scope: StyleScope): string => `appearance-style:${scopeId(scope)}`;

/** Undo-coalescing key for the force switch of a scope. */
export const enforceKey = (scope: StyleScope): string => `style-enforce:${scopeId(scope)}`;

/** Map the profile a scope targets (the config itself for "all"). */
function inScope(
  config: DashboardConfig,
  scope: StyleScope,
  all: (c: DashboardConfig) => DashboardConfig,
  one: (p: MonitorProfile) => MonitorProfile
): DashboardConfig {
  if (scope.kind === "all") return all(config);
  return { ...config, profiles: config.profiles.map((p) => (p.id === scope.profileId ? one(p) : p)) };
}

/** An empty style is stored as none. */
const orNone = (style: ModuleSettings): ModuleSettings | undefined =>
  Object.keys(style).length > 0 ? style : undefined;

/** Update the style of a scope. */
export function withScopeStyle(
  config: DashboardConfig,
  scope: StyleScope,
  fn: (style: ModuleSettings) => ModuleSettings
): DashboardConfig {
  return inScope(
    config,
    scope,
    (c) => ({ ...c, style: orNone(fn(c.style ?? {})) }),
    (p) => setProfileStyle(p, fn)
  );
}

/** Set (or, for a profile, clear with `undefined`: the dashboard's) the force switch. */
export function withStyleEnforce(
  config: DashboardConfig,
  scope: StyleScope,
  value: boolean | undefined
): DashboardConfig {
  return inScope(
    config,
    scope,
    (c) => ({ ...c, styleEnforce: value || undefined }),
    (p) => ({ ...p, styleEnforce: value })
  );
}

/** A placement's follow / custom choice. */
export const withStyleMode = (p: Placement, mode: StyleMode): Placement => ({ ...p, styleMode: mode });

/** Every widget of a profile follows the global style (their own looks stay stored). */
export function followAll(profile: MonitorProfile): MonitorProfile {
  if (profile.placements.every((p) => p.styleMode === "follow")) return profile;
  return { ...profile, placements: profile.placements.map((p) => withStyleMode(p, "follow")) };
}

/**
 * The palette's force toggle: the profile's switch when it has its own,
 * else the dashboard's.
 */
export function toggleEnforce(config: DashboardConfig, profile: MonitorProfile): DashboardConfig {
  if (profile.styleEnforce !== undefined)
    return withStyleEnforce(config, { kind: "profile", profileId: profile.id }, !profile.styleEnforce);
  return withStyleEnforce(config, { kind: "all" }, !config.styleEnforce);
}

/** The toast after applying a preset. */
export const appliedMessage = (name: string, target: "all" | "profile"): string =>
  `Applied ${name} to ${target === "all" ? "all profiles" : "this profile"}`;

/**
 * The preset the current look is: same theme colours, corner radius and
 * every style key the preset sets (the first match; undefined = a custom look).
 */
export function activePresetId(
  presets: readonly AppearancePreset[],
  look: { tokens: ThemeTokens; radius: number; style: ModuleSettings | undefined }
): string | undefined {
  const tokens = JSON.stringify(look.tokens);
  return presets.find(
    (p) =>
      p.radius === look.radius &&
      JSON.stringify(presetTokens(p)) === tokens &&
      Object.entries(p.style).every(([key, value]) => look.style?.[key] === value)
  )?.id;
}
