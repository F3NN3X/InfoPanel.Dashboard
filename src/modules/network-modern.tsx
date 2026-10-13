import { templateModule } from "@/widgets/module";
import * as NetworkThroughput from "@/widgets/NetworkThroughput";
import type { ModuleSetting, ModuleSettings } from "./types";

const NET = "libre.ethernet_";
const DEFAULT_DL_COLOR = "#34d399";
const DEFAULT_UL_COLOR = "#60a5fa";

/**
 * Modern network widget — current download / upload speed (the `libre.*`
 * LibreHardwareMonitor adapter keys, the busiest adapter) with a session
 * totals row and link utilization, plus optional rolling speed sparklines. Rendered by the
 * `NetworkThroughput` template through the widget shell.
 */

export const NETWORK_SETTINGS: ModuleSetting[] = [
  {
    key: "view",
    label: "View",
    type: "select",
    default: "speeds",
    options: [
      { value: "speeds", label: "Speeds" },
      {
        value: "totals",
        label: "Totals",
        applies: { showTotals: true, sparkline: true },
      },
    ],
    group: "Content",
  },
  { key: "showTotals", label: "Session totals", type: "boolean", default: true, group: "Content" },
  { key: "sparkline", label: "Trend sparkline", type: "boolean", default: false, group: "Content" },
  { key: "downloadColor", label: "Download color", type: "color", default: "", group: "Speed colors" },
  { key: "uploadColor", label: "Upload color", type: "color", default: "", group: "Speed colors" },
];

export const networkToProps = (s: ModuleSettings): Partial<NetworkThroughput.NetworkThroughputProps> => ({
  view: s.view === "totals" ? "totals" : "speeds",
  showTotals: Boolean(s.showTotals),
  sparkline: Boolean(s.sparkline),
  // the legacy widget's default speed colours, kept for the alias
  downloadColor: String(s.downloadColor || DEFAULT_DL_COLOR),
  uploadColor: String(s.uploadColor || DEFAULT_UL_COLOR),
});

export const networkModernModule = templateModule({
  meta: NetworkThroughput.meta,
  Component: NetworkThroughput.default,
  settings: NETWORK_SETTINGS,
  toProps: networkToProps,
  alias: { id: "networkmodern", title: "Network (modern)", minCols: 2, minRows: 1, prefixes: [NET] },
});
