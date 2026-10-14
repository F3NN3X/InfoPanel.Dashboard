// FpsMonitor's look settings and their mapping to props (same keys, defaults and groups as the old FPS
// widget).
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import type { FpsMonitorProps } from "./FpsMonitor";

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

