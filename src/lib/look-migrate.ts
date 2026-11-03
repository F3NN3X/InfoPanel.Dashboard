import { CLASSIC_LOOK, SAMPLE_LOOK_IDS, SKIN_LOOK_IDS } from "@/looks/ids";
import type { ModuleSettings } from "@/modules/types";
import type { AppliedTheme } from "./applied-theme";
import type { DashboardConfig, StoredConfig } from "./layout";
import { withThemeValues } from "./theme-model";

// The v17 step (config-upgrade.ts), in its own module so only an older config's load carries it. Config v17 folds the
// skins into Looks (D6): a level stores one `lookId`, and its other values are the overrides on top of it.

/** The Look a v16 skin value is: a skin's Look is named as the skin; the Default skin's spellings (`auto`, `default`, "") and an unknown skin are Classic. */
export const lookOfStoredSkin = (skin: unknown): string => (typeof skin === "string" && SKIN_LOOK_IDS.includes(skin) ? skin : CLASSIC_LOOK);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every `skin` key under `value` as a `lookId` (a value that isn't text stays a `skin`, which nothing reads). */
function renamed(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(renamed);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => (key === "skin" && typeof v === "string" ? ["lookId", lookOfStoredSkin(v)] : [key, renamed(v)]))
  );
}

/** The parts of a stored config that hold look values: the old dashboard style, the saved styles, panels and themes, the screens. */
const LOOK_HOLDERS = ["style", "stylePresets", "panelPresets", "appearancePresets", "profiles"] as const;

/**
 * v17, first half, on the stored config before any other step (so the older steps, which move look values by the
 * themed keys, carry the Look): every stored skin becomes the level's Look, wherever a look value is kept (a screen's
 * or page's values and theme snapshot with the widget writes it made, a widget's own settings, a saved style, panel or
 * theme, the old dashboard style). `auto`, `default` and an unknown skin are Classic, which draws the Default skin, so
 * nothing repaints. The follow and lock flags stay: the skin section's flags govern the Look.
 */
export function renameSkinsV17(config: StoredConfig): StoredConfig {
  const out: Record<string, unknown> = { ...config };
  for (const key of LOOK_HOLDERS) if (out[key] !== undefined) out[key] = renamed(out[key]);
  return out as StoredConfig;
}

/** Whether a stored Look is Classic (or none): what a level that applied a sample theme before v17 holds. */
const isClassic = (lookId: unknown): boolean => lookId === undefined || lookId === CLASSIC_LOOK;

/** The sample Look a card (`look-<id>`) is, else none (L32). */
function sampleOfCard(surface: unknown): string | undefined {
  const id = typeof surface === "string" && surface.startsWith("look-") ? surface.slice(5) : undefined;
  return id && SAMPLE_LOOK_IDS.includes(id) ? id : undefined;
}

const withLook = (values: ModuleSettings | undefined, lookId: string): ModuleSettings => ({ ...values, lookId });

/**
 * v17, second half: a level whose theme is a sample theme (`builtin:look-<id>`) or a saved copy of one names its Look,
 * in its values and its snapshot, as applying it now writes them. Only where the snapshot names no Look yet (a v16
 * one; so the step can run twice) and the level draws the Default skin, so nothing repaints: a screen holding
 * Classic, a page whose skin section is its own (not locked by its screen) and draws Classic. A page that follows its
 * screen's skin keeps following and names no Look, nor does its snapshot, so it shows no change. A saved theme copied
 * from a sample theme (its card `look-<id>`, Classic) names that Look.
 */
export function migrateLooksV17(config: DashboardConfig): DashboardConfig {
  const appearancePresets = config.appearancePresets?.map((preset) => {
    const id = isClassic(preset.style.lookId) ? sampleOfCard(preset.style.surface) : undefined;
    return id ? { ...preset, style: withLook(preset.style, id) } : preset;
  });
  const sampleOf = (applied: AppliedTheme | undefined): string | undefined => {
    if (!applied || !isClassic(applied.values?.lookId)) return undefined;
    const builtin = applied.id.startsWith("builtin:look-") ? applied.id.slice("builtin:look-".length) : undefined;
    if (builtin) return SAMPLE_LOOK_IDS.includes(builtin) ? builtin : undefined;
    const saved = appearancePresets?.find((p) => p.id === applied.id)?.style.lookId;
    return typeof saved === "string" && SAMPLE_LOOK_IDS.includes(saved) ? saved : undefined;
  };
  const profiles = config.profiles.map((p) => {
    const screenId = isClassic(p.widgetTheme?.values?.lookId) ? sampleOf(p.appliedTheme) : undefined;
    const screenValues = screenId ? withLook(p.widgetTheme?.values, screenId) : p.widgetTheme?.values;
    const locked = p.widgetTheme?.locks?.skin === true;
    const pages = p.pages.map((pg) => {
      const custom = !locked && pg.widgetTheme?.follow?.skin === false;
      const shown = pg.widgetTheme?.values?.lookId ?? screenValues?.lookId;
      const id = custom && !SKIN_LOOK_IDS.includes(String(shown)) && isClassic(pg.widgetTheme?.values?.lookId) ? sampleOf(pg.appliedTheme) : undefined;
      if (!id || !pg.appliedTheme) return pg;
      return { ...pg, widgetTheme: withThemeValues(pg.widgetTheme, withLook(pg.widgetTheme?.values, id)), appliedTheme: { ...pg.appliedTheme, values: withLook(pg.appliedTheme.values, id) } };
    });
    if (screenId && p.appliedTheme) {
      return { ...p, pages, widgetTheme: withThemeValues(p.widgetTheme, screenValues), appliedTheme: { ...p.appliedTheme, values: withLook(p.appliedTheme.values, screenId) } };
    }
    return pages.every((pg, i) => pg === p.pages[i]) ? p : { ...p, pages };
  });
  return { ...config, profiles, ...(appearancePresets ? { appearancePresets } : {}) };
}
