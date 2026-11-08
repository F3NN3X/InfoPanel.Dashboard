// CPU Monitor: load, temperature, power and clock, with the threads as bars or a heatmap. What the registry needs; the
// component is its own chunk.
import { decimalsOf, deviceOf, tempUnitOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { deviceSetting, enumSetting, formatSetting, oneOf, optionPairs as opts, thresholdSetting } from "../shared/settings-kit";
import type { CpuMonitorProps } from "./CpuMonitor";
import { meta } from "./meta";

const settings: ModuleSetting[] = [
  enumSetting("coreView", "Threads", "bars", opts(["bars", "Bars"], ["heatmap", "Heatmap"], ["off", "Off"]), { group: "Threads" }),
  enumSetting("coreMetric", "Metric", "load", opts(["load", "Load"], ["clock", "Clock"]), { group: "Threads", visibleIf: (v) => v.coreView !== "off" }),
  enumSetting("heatRamp", "Heatmap ramp", "accent", opts(["accent", "Accent"], ["thermal", "Thermal"]), { tab: "style", perWidget: true, visibleIf: (v) => v.coreView === "heatmap" }),
  deviceSetting("Processor", "cpu", { group: "Processor" }),
  thresholdSetting("load"),
  formatSetting("tempUnit"),
  formatSetting("decimals"),
];

export default defineWidget({
  meta,
  // A summary card; the unit and decimals of its temperatures, the Load threshold.
  inspector: { header: "yes", compact: CARD, fmt: ["tempUnit", "decimals"], thr: ["load"] },
  settings,
  render: {
    load: () => import("./CpuMonitor"),
    toProps: (s: ModuleSettings): Partial<CpuMonitorProps> => ({
      cpu: deviceOf(s, "cpu"),
      coreView: oneOf(s.coreView, ["bars", "heatmap", "off"]),
      coreMetric: oneOf(s.coreMetric, ["load", "clock"]),
      heatRamp: oneOf(s.heatRamp, ["accent", "thermal"]),
      ...thresholdsOf(s, "load", ["warn", "crit"]),
      tempUnit: tempUnitOf(s),
      decimals: decimalsOf(s),
    }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 Load levels and device key `cpu`;
  // the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
