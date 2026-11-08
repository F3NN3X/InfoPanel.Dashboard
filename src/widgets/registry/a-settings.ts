// Inspector settings of the group A templates: every widget-specific prop of the spec as a setting,
// with the adapters back to props (_docs/redesign/phase9/brief-9.5-inspector.md). SystemOverview's are in
// shared/system-overview.ts; the widgets with a folder (`src/widgets/<kebab-id>/widget.ts`) carry their own.
import { decimalsOf, deviceOf, tempUnitOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { deviceSetting, enumSetting, formatSetting, listPick, numberOf, numberSetting, oneOf, optionPairs as opts, thresholdSetting } from "../shared/settings-kit";
import type { CoreHeatmapProps } from "../CoreHeatmap";
import type { CpuMonitorProps } from "../CpuMonitor";
import type { GpuMonitorProps } from "../GpuMonitor";
import type { KpiTilesProps } from "../KpiTiles";
import type { VitalsProps } from "../Vitals";

/* ───────── KpiTiles ───────── */
const KPI_METRICS = ["cpu", "gpu", "ram", "net", "vram", "power"] as const;
export const KPITILES_SETTINGS: ModuleSetting[] = [
  enumSetting("metrics", "Tiles", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "Memory"], ["net", "Network"], ["vram", "VRAM"], ["power", "Power"]), { multiple: true, group: "Tiles" }),
  numberSetting("lookback", "Change over (readings)", 10, { min: 2, max: 60, step: 1, group: "History", tab: "behaviour" }),
];
export const kpiTilesProps = (s: ModuleSettings): Partial<KpiTilesProps> => ({ metrics: listPick(s.metrics, KPI_METRICS), lookback: numberOf(s.lookback) });

/* ───────── Vitals ───────── */
const VITALS_METRICS = ["cpu", "gpu", "ram", "net", "vram", "fps"] as const;
export const VITALS_SETTINGS: ModuleSetting[] = [
  enumSetting("metrics", "Metrics", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "RAM"], ["net", "Network"], ["vram", "VRAM"], ["fps", "FPS"]), { multiple: true, group: "Metrics" }),
];
export const vitalsProps = (s: ModuleSettings): Partial<VitalsProps> => ({ metrics: listPick(s.metrics, VITALS_METRICS) });

/* ───────── CpuMonitor / CoreHeatmap ───────── */
export const CPUMONITOR_SETTINGS: ModuleSetting[] = [
  enumSetting("coreView", "Threads", "bars", opts(["bars", "Bars"], ["heatmap", "Heatmap"], ["off", "Off"]), { group: "Threads" }),
  enumSetting("coreMetric", "Metric", "load", opts(["load", "Load"], ["clock", "Clock"]), { group: "Threads", visibleIf: (v) => v.coreView !== "off" }),
  enumSetting("heatRamp", "Heatmap ramp", "accent", opts(["accent", "Accent"], ["thermal", "Thermal"]), { tab: "style", perWidget: true, visibleIf: (v) => v.coreView === "heatmap" }),
  deviceSetting("Processor", "cpu", { group: "Processor" }),
  thresholdSetting("load"),
  formatSetting("tempUnit"),
  formatSetting("decimals"),
];
export const cpuMonitorProps = (s: ModuleSettings): Partial<CpuMonitorProps> => ({
  cpu: deviceOf(s, "cpu"),
  coreView: oneOf(s.coreView, ["bars", "heatmap", "off"]),
  coreMetric: oneOf(s.coreMetric, ["load", "clock"]),
  heatRamp: oneOf(s.heatRamp, ["accent", "thermal"]),
  ...thresholdsOf(s, "load", ["warn", "crit"]),
  tempUnit: tempUnitOf(s),
  decimals: decimalsOf(s),
});

const RAMPS = ["accent", "thermal", "viridis", "magma", "ice", "synth", "mono"] as const;
export const COREHEATMAP_SETTINGS: ModuleSetting[] = [
  enumSetting("shape", "Shape", "grid", opts(["grid", "Grid"], ["hex", "Hexagons"], ["radial", "Radial"], ["waterfall", "Waterfall"]), { group: "Cells" }),
  enumSetting("metric", "Metric", "load", opts(["load", "Load"], ["clock", "Clock"], ["power", "Power"], ["vid", "Voltage (VID)"]), { group: "Cells" }),
  enumSetting("showValues", "Values in cells", "auto", opts(["auto", "Auto"], ["on", "Show"], ["off", "Hide"]), { group: "Cells", visibleIf: (v) => v.shape === "grid" || v.shape === "hex" }),
  enumSetting("ramp", "Color ramp", "accent", RAMPS.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), { tab: "style", more: true, perWidget: true }),
  deviceSetting("Processor", "cpu", { group: "Processor" }),
  numberSetting("history", "Waterfall columns", 60, { min: 10, max: 240, step: 10, group: "History", tab: "behaviour", visibleIf: (v) => v.shape === "waterfall" }),
  numberSetting("hotOutline", "Outline cells above (%)", 80, { min: 0, max: 100, step: 5, section: "thresholds", hint: "Share of the metric's highest value (load: percent)", visibleIf: (v) => v.shape === "grid" }),
];
export const coreHeatmapProps = (s: ModuleSettings): Partial<CoreHeatmapProps> => ({
  cpu: deviceOf(s, "cpu"),
  shape: oneOf(s.shape, ["grid", "hex", "radial", "waterfall"]),
  metric: oneOf(s.metric, ["load", "clock", "power", "vid"]),
  ramp: oneOf(s.ramp, RAMPS),
  showValues: s.showValues === "on" ? true : s.showValues === "off" ? false : undefined,
  history: numberOf(s.history),
  hotOutline: numberOf(s.hotOutline),
});

/* ───────── GpuMonitor ───────── */
export const GPUMONITOR_SETTINGS: ModuleSetting[] = [deviceSetting("Graphics card", "gpu", { group: "Graphics card" }), thresholdSetting("temp")];
export const gpuMonitorProps = (s: ModuleSettings): Partial<GpuMonitorProps> => {
  const { warn, crit } = thresholdsOf(s, "temp", ["warnTemp", "critTemp"]);
  return { gpu: deviceOf(s, "gpu"), warnTemp: warn, critTemp: crit };
};
