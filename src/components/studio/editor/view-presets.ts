import type { DashboardModule, ModuleSettings } from "@/modules/types";

/** The key a module stores its view under. */
export const viewKeyOf = (mod: Pick<DashboardModule, "viewKey">): string => mod.viewKey ?? "view";

/** The module's views, when it has a choice of them: a one-view widget has no Preset row. */
export const viewsOf = (mod: Pick<DashboardModule, "views"> | undefined) => ((mod?.views?.length ?? 0) >= 2 ? (mod?.views ?? []) : []);

/**
 * The view a zone shows (D-5): its saved `settings[viewKey]`, else the setting's default, else the first. Read only:
 * a placement keeps the id it has, whatever the row shows (G1).
 */
export function currentView(mod: DashboardModule, settings: ModuleSettings | undefined): string | undefined {
  const views = viewsOf(mod);
  const key = viewKeyOf(mod);
  const known = (id: unknown) => views.some((v) => v.id === id);
  const stored = settings?.[key];
  if (known(stored)) return stored as string;
  const fallback = mod.settings?.find((d) => d.key === key)?.default;
  return known(fallback) ? (fallback as string) : views[0]?.id;
}

/**
 * Picking a view: the same settings Add gives it (`{ [viewKey]: id, ...applies }`), and the keys only another view's
 * bundle set, while they still hold that view's value, go back to their default.
 */
export function viewChange(mod: DashboardModule, id: string, settings: ModuleSettings | undefined): { patch: ModuleSettings; clear: string[] } {
  const views = viewsOf(mod);
  const applies = views.find((v) => v.id === id)?.applies ?? {};
  const clear = views
    .filter((v) => v.id !== id)
    .flatMap((v) => Object.entries(v.applies ?? {}))
    .filter(([key, value]) => !(key in applies) && settings?.[key] === value)
    .map(([key]) => key);
  return { patch: { [viewKeyOf(mod)]: id, ...applies }, clear: [...new Set(clear)] };
}
