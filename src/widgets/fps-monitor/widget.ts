// FPS Monitor: frame rate, 1% low and frame time from RTSS or PresentMon, with the Frame Pacing graph as one of its views.
// What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, CARD, defineWidget } from "../define";
import { fpsIsland } from "../island/gaming";
import { FPS_LOOK_SETTINGS, fpsLookProps, targetOf, targetSetting } from "../shared/fps-settings";
import { listOf, numberOf, numberSetting, splitKeys, textSetting, viewOnly, viewsExcept, viewSetting } from "../shared/settings-kit";
import type { FpsMonitorWidgetProps } from "./FpsMonitor";
import { meta } from "./meta";

/** The gauge and trend views read the metrics, sparkline and colours; the frame-time graph reads none of them. */
const gaugeOnly = viewOnly(meta, "gauge", "trend");
/** The pacing view is the Frame Pacing widget: its budget lines and samples; the FPS target is the other views'. */
const pacingOnly = viewOnly(meta, "pacing");
const notPacing = viewOnly(meta, ...viewsExcept(meta, "pacing"));

/** Budget lines in Hz: a stored list or a comma-separated string ("" = the widget's default). */
const hzList = (v: unknown): number[] | undefined => {
  const l = Array.isArray(v) ? listOf(v, numberOf) : splitKeys(v).map(numberOf).filter((n): n is number => n !== undefined);
  return l?.length ? l : undefined;
};

export default defineWidget({
  meta,
  // A summary card; the pacing view has a dense view of its own too (the Frame Pacing widget's).
  inspector: { header: "yes", compact: CARD, byView: { pacing: { compact: BOTH } } },
  settings: [
    viewSetting(meta, { bundleDefaults: { sparkline: false }, group: "Display", hint: "Trend is the gauge with the sparkline on." }),
    ...FPS_LOOK_SETTINGS.map(gaugeOnly),
    notPacing(targetSetting),
    pacingOnly(textSetting("budgets", "Budget lines (Hz, comma-separated)", "", { group: "Budget lines", hint: "Empty = refresh rate and 60" })),
    pacingOnly(numberSetting("window", "Samples", 120, { min: 30, max: 600, step: 10, group: "History", tab: "behaviour" })),
  ],
  render: {
    load: () => import("./FpsMonitor"),
    toProps: (s: ModuleSettings): Partial<FpsMonitorWidgetProps> =>
      s.view === "pacing" ? { view: "pacing", budgets: hzList(s.budgets), window: numberOf(s.window) } : { target: targetOf(s.target), ...fpsLookProps(s) },
  },
  island: fpsIsland,
  // Migrations and sample stay central (the default): settings-migrate.ts has the v8 trend view's `sparkline`, and config v19
  // (settings-migrate.v19.ts) made every Frame Pacing placement this widget's pacing view; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
