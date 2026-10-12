import { entry, liveText, liveValue } from "@/lib/sensors";
import FpsMonitor, { meta, type FpsMonitorProps } from "@/widgets/FpsMonitor";
import { FPS_LOOK_SETTINGS, FPS_VIEW_OPTIONS, fpsLookProps } from "@/widgets/fps-settings";
import { templateModule } from "@/widgets/module";
import { IDLE_SETTING } from "./standard-settings";
import type { DashboardModule, ModuleSetting, SensorMap } from "./types";

const RTSS = "plugins.InfoPanel.RTSS.";
const FPS = "plugins.fps-plugin.";

/**
 * Modern FPS / performance widget, kept loadable under its old id: the FPS ring gauge (value vs.
 * refresh rate) with 1% low / frame time / GPU around it, rendered by the `FpsMonitor` template.
 * Reads the same RTSS / PresentMon sources.
 */

export const FPS_MODERN_SETTINGS: ModuleSetting[] = [
  IDLE_SETTING,
  {
    key: "view",
    label: "View",
    type: "select",
    default: "gauge",
    options: FPS_VIEW_OPTIONS,
    group: "Content",
  },
  ...FPS_LOOK_SETTINGS,
];

const fpsOf = (sensors: SensorMap) =>
  liveValue(entry(sensors, RTSS, "rtss", "fps")) ?? liveValue(entry(sensors, FPS, "fps", "fps"));

const template = templateModule<Pick<FpsMonitorProps, "view" | "showMetrics" | "sparkline" | "ringColor" | "sparkColor">>({
  meta: { ...meta, id: "fpsmodern", name: "FPS (modern)", prefixes: [RTSS, FPS], minSize: [2, 1] },
  Component: FpsMonitor,
  settings: FPS_MODERN_SETTINGS,
  // The stored `view` only bundles the sparkline switch (`applies`); the layout is always the gauge.
  toProps: (s) => ({ ...fpsLookProps(s), view: "gauge" }),
  // Idle = no frames counted (no game running).
  isIdle: (sensors) => {
    const fps = fpsOf(sensors);
    return fps === undefined || fps <= 0;
  },
});

export const fpsModernModule: DashboardModule = {
  ...template,
  libraryHidden: true,
  render: (sensors, s) => {
    const rt = (id: string) => entry(sensors, RTSS, "rtss", id);
    const fp = (id: string) => entry(sensors, FPS, "fps", id);
    // Nothing from either source: hide the section.
    const hasData = fpsOf(sensors) !== undefined || liveText(rt("gpu-name")) || liveText(fp("gpu-name")) || liveText(rt("windowtitle")) || liveText(fp("windowtitle"));
    return hasData ? template.render(sensors, s) : null;
  },
};
