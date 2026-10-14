// FpsMonitor's look settings, their mapping to props and its idle rule (same keys, defaults and groups
// as the old FPS widget).
import { entry, liveValue } from "@/lib/sensors";
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import type { FpsMonitorProps } from "./FpsMonitor";

const RTSS = "plugins.InfoPanel.RTSS.";
const FPS = "plugins.fps-plugin.";

/** showMetrics, sparkline and the two colours. */
export const FPS_LOOK_SETTINGS: ModuleSetting[] = [
  { key: "showMetrics", label: "Extra metrics", type: "boolean", default: true, group: "Content" },
  { key: "sparkline", label: "Trend sparkline", type: "boolean", default: false, group: "Content" },
  { key: "ringColor", label: "Ring color", type: "color", default: "", group: "Gauge colors" },
  { key: "sparkColor", label: "Trend sparkline color", type: "color", default: "", group: "Gauge colors" },
];

type FpsLookProps = Pick<FpsMonitorProps, "view" | "showMetrics" | "sparkline" | "ringColor" | "sparkColor">;

/** The stored keys as props; `view` is the stored choice when it names a gauge view. */
export function fpsLookProps(s: ModuleSettings): FpsLookProps {
  return {
    view: s.view === "gauge" || s.view === "trend" ? s.view : undefined,
    showMetrics: Boolean(s.showMetrics),
    sparkline: Boolean(s.sparkline),
    ringColor: String(s.ringColor ?? ""),
    sparkColor: String(s.sparkColor ?? ""),
  };
}

/** Idle = no frames counted (no game running), from RTSS or PresentMon. */
export const fpsIdle: NonNullable<DashboardModule["isIdle"]> = (sensors) => {
  const fps = liveValue(entry(sensors, RTSS, "rtss", "fps")) ?? liveValue(entry(sensors, FPS, "fps", "fps"));
  return fps === undefined || fps <= 0;
};
