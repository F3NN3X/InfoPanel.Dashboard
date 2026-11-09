// Session Stats: min, max, average and time above a level for up to six sensors, with the Threshold Timeline's lanes as
// one of its views. What the registry needs; the component is its own chunk.
import { thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { numberOf, numberSetting, oneOf, sensorSetting, splitKeys, thresholdSetting, viewOnly, viewSetting } from "../shared/settings-kit";
import { MAX_LANES, MAX_SENSORS, meta } from "./meta";
import type { SessionStatsWidgetProps } from "./SessionStats";

const SENSORS_HINT = `Up to ${MAX_SENSORS}. Empty = CPU and GPU load and temperature`;
const statsOnly = viewOnly(meta, "stats");
/** The lanes view is the Threshold Timeline widget: its window and its value thresholds. */
const lanesOnly = viewOnly(meta, "lanes");

export default defineWidget({
  meta,
  // A summary card in both views; the lanes view colours by the value thresholds (the Threshold Timeline widget's).
  inspector: { header: "yes", compact: CARD, byView: { lanes: { thr: ["value"] } } },
  settings: [
    viewSetting(meta, { group: "Sensors" }),
    // the same row in both views (both took up to six, the same default)
    sensorSetting("sensors", "Sensors", { group: "Sensors", tab: "data", multiple: true, hint: SENSORS_HINT }),
    statsOnly(numberSetting("above", "Time above", 80, { min: -100, max: 10000, step: 5, group: "Level", tab: "behaviour", hint: "In each sensor's own unit. Changing it starts the counts over" })),
    lanesOnly(numberSetting("window", "Window (min)", 5, { min: 1, max: 30, step: 1, group: "History", tab: "behaviour" })),
    lanesOnly(thresholdSetting("value")),
  ],
  render: {
    load: () => import("./SessionStats"),
    toProps: (s: ModuleSettings): Partial<SessionStatsWidgetProps> =>
      s.view === "lanes"
        ? { view: "lanes", sensors: splitKeys(s.sensors).slice(0, MAX_LANES), window: numberOf(s.window), ...thresholdsOf(s, "value") }
        : { view: oneOf(s.view, ["stats"]), sensors: splitKeys(s.sensors).slice(0, MAX_SENSORS), above: numberOf(s.above) },
  },
  // Migrations and sample stay central (the default): config v19 (settings-migrate.v19.ts) made every Threshold Timeline
  // placement this widget's lanes view; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
