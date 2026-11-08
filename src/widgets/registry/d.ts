// Template widgets, group D: gaming (see _docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import { listOf, numberOf, numberSetting, splitKeys, textSetting, viewOnly, viewSetting } from "../shared/settings-kit";
import type { FpsMonitorProps } from "../FpsMonitor";
import { meta as fpsMonitorMeta } from "../meta/FpsMonitor";
import type { FramePacingProps } from "../FramePacing";
import { meta as framePacingMeta } from "../meta/FramePacing";
import { FPS_LOOK_SETTINGS, fpsLookProps, targetOf, targetSetting } from "../fps-settings";
import { fpsIsland } from "../island/gaming";

// Each component loads in its own chunk, the first time a zone draws it.
const FpsMonitor = lazyWidget(() => import("../FpsMonitor"));
const FramePacing = lazyWidget(() => import("../FramePacing"));

/** The gauge and trend views read the metrics, sparkline and colours; the frame-time graph reads none of them. */
const gaugeOnly = viewOnly(fpsMonitorMeta, "gauge", "trend");

/** Budget lines in Hz: a stored list or a comma-separated string ("" = the widget's default). */
const hzList = (v: unknown): number[] | undefined => {
  const l = Array.isArray(v) ? listOf(v, numberOf) : splitKeys(v).map(numberOf).filter((n): n is number => n !== undefined);
  return l?.length ? l : undefined;
};

export const GROUP_D: DashboardModule[] = [
  templateModule<Pick<FpsMonitorProps, "target" | "view" | "showMetrics" | "sparkline" | "ringColor" | "sparkColor">>({
    meta: fpsMonitorMeta,
    Component: FpsMonitor,
    settings: [
      viewSetting(fpsMonitorMeta, { bundleDefaults: { sparkline: false }, group: "Display", hint: "Trend is the gauge with the sparkline on." }),
      ...FPS_LOOK_SETTINGS.map(gaugeOnly),
      targetSetting,
    ],
    toProps: (s: ModuleSettings) => ({ target: targetOf(s.target), ...fpsLookProps(s) }),
    island: fpsIsland,
  }),
  templateModule<Pick<FramePacingProps, "budgets" | "window">>({
    meta: framePacingMeta,
    Component: FramePacing,
    settings: [
      textSetting("budgets", "Budget lines (Hz, comma-separated)", "", { group: "Budget lines", hint: "Empty = refresh rate and 60" }),
      numberSetting("window", "Samples", 120, { min: 30, max: 600, step: 10, group: "History", tab: "behaviour" }),
    ],
    toProps: (s) => ({ budgets: hzList(s.budgets), window: numberOf(s.window) }),
  }),
];
