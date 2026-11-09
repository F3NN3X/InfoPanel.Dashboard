// Session Stats' lanes view is the Threshold Timeline widget (config v19, _docs/widgets/MERGES.md M3): a Threshold Timeline
// zone, migrated, draws what the Threshold Timeline widget drew. That widget's definition before the merge is frozen below
// (its meta, schema and props from registry/history.ts at ca49b21f) and drawn beside the registry's Session Stats in the
// lanes view.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { migratePlacementV19 } from "@/lib/settings-migrate.v19";
import { modules } from "@/modules";
import { thresholdsOf } from "@/modules/setting-readers";
import { settingKeys, type ModuleSettings, type SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import type { WidgetMeta } from "@/widgets/core/types";
import { templateModule } from "@/widgets/module";
import ThresholdTimeline, { type ThresholdTimelineProps } from "@/widgets/session-stats/ThresholdTimeline";
import { numberOf, numberSetting, sensorSetting, splitKeys, thresholdSetting } from "@/widgets/shared/settings-kit";

const TIMELINE_META: WidgetMeta = {
  id: "ThresholdTimeline",
  name: "Threshold Timeline",
  category: "Generic",
  icon: "health_metrics",
  prefixes: [],
  defaultSize: [4, 2],
  minSize: [2, 1],
  blurb: "Green, amber and red lanes over minutes",
  tags: "timeline history lanes threshold heat strip status minutes",
  description: "One lane per sensor (up to six), colored green, amber or red by its thresholds over the last few minutes. Shows when a sensor was hot, not just that it is. Nothing is stored: a reload starts again.",
};
const MAX_LANES = 6;
const TIMELINE = templateModule<Pick<ThresholdTimelineProps, "sensors" | "window" | "warn" | "crit">>({
  meta: TIMELINE_META,
  Component: ThresholdTimeline,
  settings: [
    sensorSetting("sensors", "Sensors", { group: "Sensors", tab: "data", multiple: true, hint: `Up to ${MAX_LANES}. Empty = CPU and GPU load and temperature` }),
    numberSetting("window", "Window (min)", 5, { min: 1, max: 30, step: 1, group: "History", tab: "behaviour" }),
    thresholdSetting("value"),
  ],
  toProps: (s) => ({ sensors: splitKeys(s.sensors).slice(0, MAX_LANES), window: numberOf(s.window), ...thresholdsOf(s, "value") }),
});
const STATS = modules.find((m) => m.id === "SessionStats")!;

const html = (node: unknown) => (node === null ? null : renderToStaticMarkup(node as never));
/** A Threshold Timeline zone's settings drawn by that widget, and the same zone migrated (v19) drawn by the registry. */
function both(settings: ModuleSettings, sensors: SensorMap) {
  const migrated = migratePlacementV19({ module: "ThresholdTimeline", settings });
  expect(migrated.module).toBe("SessionStats");
  return { before: html(TIMELINE.render(sensors, settings)), after: html(STATS.render(sensors, migrated.settings)) };
}

const ALL = fixtureSensors();
const KEYS = Object.keys(ALL).filter((k) => typeof ALL[k]?.value === "number");
/** One unrelated sensor: no role resolves, so the lanes are empty, as the widget drew them once any key existed. */
const ONE_KEY = { "plugins.example.x": { value: 1, unit: "", name: "x" } } as SensorMap;

describe("Session Stats' lanes view draws a migrated Threshold Timeline zone as that widget did", () => {
  it.each([
    ["the default (CPU and GPU by role)", {}],
    ["its own sensors", { sensors: KEYS.slice(0, 3).join(",") }],
    ["more than six sensors (the first six)", { sensors: KEYS.slice(0, 8).join(",") }],
    ["its window", { window: 15 }],
    ["its value thresholds", { "warn.value": 20, "crit.value": 40 }],
    ["thresholds off", { "warn.value": "", "crit.value": "" }],
    ["the dense small-zone view", { compact: "dense" }],
    ["the summary card", { compact: "card" }],
    ["a title and accent", { label: "Heat", accent: "#ff0000" }],
  ])("%s", (_name, settings) => {
    for (const sensors of [ALL, ONE_KEY]) {
      const { before, after } = both(settings as ModuleSettings, sensors);
      expect(before).not.toBeNull();
      expect(after).toEqual(before);
    }
  });

  it("draws nothing with no sensors at all, as before", () => {
    expect(both({}, {})).toEqual({ before: null, after: null });
  });

  it("keeps the Threshold Timeline's size, minimum, category, header and value thresholds", () => {
    const lanes = STATS.views?.find((v) => v.id === "lanes");
    expect(lanes?.defaultSize).toEqual(TIMELINE_META.defaultSize);
    expect([STATS.minCols, STATS.minRows]).toEqual(TIMELINE_META.minSize);
    expect(STATS.category).toBe(TIMELINE_META.category);
    expect({ header: STATS.header, compact: STATS.compact }).toEqual({ header: "yes", compact: { card: true, dense: "fallback" } });
    expect(STATS.byView?.lanes).toEqual({ thr: ["value"] });
  });

  it("reaches the Threshold Timeline's props through Session Stats' settings: sensors, window and the value thresholds", () => {
    const keys = (STATS.settings ?? []).flatMap(settingKeys);
    for (const key of ["sensors", "window", "warn.value", "crit.value"]) expect(keys.filter((k) => k === key), key).toHaveLength(1);
    expect(STATS.settings?.find((d) => d.key === "window")).toMatchObject({ default: 5, min: 1, max: 30 });
  });
});

describe("Session Stats' own view keeps its stats", () => {
  it("an existing Session Stats zone draws its stats, with or without the View stored, and ignores the lanes view's settings", () => {
    const stats = html(STATS.render(ALL, {}));
    expect(html(STATS.render(ALL, { view: "stats" }))).toEqual(stats);
    expect(html(STATS.render(ALL, { window: 20, "warn.value": 1 }))).toEqual(stats);
    expect(html(STATS.render(ALL, { view: "lanes" }))).not.toEqual(stats);
  });
});
