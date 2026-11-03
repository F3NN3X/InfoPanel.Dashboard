/**
 * The settings a newly added Status Bar starts with: on a screen whose island shows the time at rest, the centre is the date
 * alone, so the two do not repeat each other. Saved bars are never touched; an item's own centre wins.
 */
export function newBarSettings<S extends Record<string, unknown>>(module: string, settings: S | undefined, island: { enabled: boolean; idle: string } | undefined): S | undefined {
  if (module !== "StatusBar" || settings?.center !== undefined) return settings;
  if (!island?.enabled || island.idle === "hidden" || island.idle === "line") return settings;
  return { ...settings, center: "date" } as unknown as S;
}
