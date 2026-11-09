// The ids of the widgets that merged into another (config v19, settings-migrate.v19.ts): pure data, so the kiosk entry can
// ask whether a config names one before it loads the merge table's chunk. A row of `WIDGET_MERGES` must name one of these
// (its `from` is typed by it, and tests/lib/settings-migrate.v19.test.ts checks the two lists are the same).
export const MERGED_WIDGET_IDS = ["Forecast", "ThresholdTimeline", "Vitals", "GpuRings", "FramePacing"] as const;

export type MergedWidgetId = (typeof MERGED_WIDGET_IDS)[number];

const NAMED = new RegExp(`"module":"(?:${MERGED_WIDGET_IDS.join("|")})"`);

/** Whether a config's profiles name a merged-away widget as a zone's module or an inline canvas's Studio widget. */
export const namesMergedWidget = (profiles: unknown): boolean => NAMED.test(JSON.stringify(profiles ?? null));
