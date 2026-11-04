// A stored config and a user pack that goes away (P12b): kept apart from the importer so the studio entry does not pull the validator for it.

/** The most user packs stored: the server's `PACKS_MAX` (packs.rs; a test keeps the two equal). */
export const USER_PACKS_MAX = 32;

/** How many places in a stored config name this Look (a screen, a page, a widget, a saved look). */
export function lookUses(config: unknown, id: string): number {
  if (Array.isArray(config)) return config.reduce((n: number, v) => n + lookUses(v, id), 0);
  if (config && typeof config === "object") return Object.entries(config).reduce((n, [k, v]) => n + (k === "lookId" && v === id ? 1 : lookUses(v, id)), 0);
  return 0;
}

/** The config with every place that names this Look set to Classic's (the level then draws Classic: `lookId` unset). */
export function withoutLookId<T>(config: T, id: string): T {
  if (Array.isArray(config)) return config.map((v) => withoutLookId(v, id)) as T;
  if (config && typeof config === "object") return Object.fromEntries(Object.entries(config).flatMap(([k, v]) => (k === "lookId" && v === id ? [] : [[k, withoutLookId(v, id)]]))) as T;
  return config;
}
