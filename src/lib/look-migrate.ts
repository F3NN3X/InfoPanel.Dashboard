import { SAMPLE_LOOK_IDS } from "@/looks";
import type { ModuleSettings } from "@/modules/types";
import type { DashboardConfig } from "./layout";
import { withThemeValues } from "./theme-model";

// The v17 step (config-upgrade.ts): a module of its own, so only an older config's load carries the Look registry.

/** The sample Look a theme snapshot (`builtin:look-<id>`) or a card (`look-<id>`) names, else none (L32). */
function sampleLookOf(value: unknown, prefix: string): string | undefined {
  const id = typeof value === "string" && value.startsWith(prefix) ? value.slice(prefix.length) : undefined;
  return id && SAMPLE_LOOK_IDS.includes(id) ? id : undefined;
}

const withLook = (values: ModuleSettings | undefined, lookId: string): ModuleSettings => ({ ...values, lookId });

/**
 * v17 (D6): each level stores a `lookId` with its values as the overrides on top; unset is Classic, so every level
 * that sets none resolves as before. Besides Classic only the sample themes are Looks (L32), and what applying one
 * wrote stays as the level's values: a screen whose snapshot is a sample theme (`builtin:look-<id>`) gets its Look in
 * its values and its snapshot, as applying it now writes them. A page with such a snapshot gets it too, unless its
 * screen locks the skin section (applying skips a locked section); a page that follows its screen's skin keeps
 * following, the Look stored with its section's other inactive values, so no stored skin of the page starts to apply.
 * A saved theme copied from a sample theme (its card `look-<id>`) names that Look. Skins and every other value stay.
 */
export function migrateLooksV17(config: DashboardConfig): DashboardConfig {
  const profiles = config.profiles.map((p) => {
    const locked = p.widgetTheme?.locks?.skin === true;
    const pages = p.pages.map((pg) => {
      const id = locked ? undefined : sampleLookOf(pg.appliedTheme?.id, "builtin:look-");
      if (!id || !pg.appliedTheme) return pg;
      return { ...pg, widgetTheme: withThemeValues(pg.widgetTheme, withLook(pg.widgetTheme?.values, id)), appliedTheme: { ...pg.appliedTheme, values: withLook(pg.appliedTheme.values, id) } };
    });
    const screen = p.appliedTheme && sampleLookOf(p.appliedTheme.id, "builtin:look-");
    if (screen && p.appliedTheme) {
      return { ...p, pages, widgetTheme: withThemeValues(p.widgetTheme, withLook(p.widgetTheme?.values, screen)), appliedTheme: { ...p.appliedTheme, values: withLook(p.appliedTheme.values, screen) } };
    }
    return pages.every((pg, i) => pg === p.pages[i]) ? p : { ...p, pages };
  });
  const appearancePresets = config.appearancePresets?.map((preset) => {
    const id = preset.style.lookId === undefined ? sampleLookOf(preset.style.surface, "look-") : undefined;
    return id ? { ...preset, style: withLook(preset.style, id) } : preset;
  });
  return { ...config, profiles, ...(appearancePresets ? { appearancePresets } : {}) };
}
