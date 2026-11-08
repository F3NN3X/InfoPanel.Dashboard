// Core Heatmap: every thread's load, clock, power or voltage as cells. What the registry needs; the component is its
// own chunk.
import { deviceOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { DENSE, defineWidget } from "../define";
import { deviceSetting, enumSetting, numberOf, numberSetting, oneOf, optionPairs as opts } from "../shared/settings-kit";
import type { CoreHeatmapProps } from "./CoreHeatmap";
import { meta } from "./meta";

const RAMPS = ["accent", "thermal", "viridis", "magma", "ice", "synth", "mono"] as const;

const settings: ModuleSetting[] = [
  enumSetting("shape", "Shape", "grid", opts(["grid", "Grid"], ["hex", "Hexagons"], ["radial", "Radial"], ["waterfall", "Waterfall"]), { group: "Cells" }),
  enumSetting("metric", "Metric", "load", opts(["load", "Load"], ["clock", "Clock"], ["power", "Power"], ["vid", "Voltage (VID)"]), { group: "Cells" }),
  enumSetting("showValues", "Values in cells", "auto", opts(["auto", "Auto"], ["on", "Show"], ["off", "Hide"]), { group: "Cells", visibleIf: (v) => v.shape === "grid" || v.shape === "hex" }),
  enumSetting("ramp", "Color ramp", "accent", RAMPS.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), { tab: "style", more: true, perWidget: true }),
  deviceSetting("Processor", "cpu", { group: "Processor" }),
  numberSetting("history", "Waterfall columns", 60, { min: 10, max: 240, step: 10, group: "History", tab: "behaviour", visibleIf: (v) => v.shape === "waterfall" }),
  numberSetting("hotOutline", "Outline cells above (%)", 80, { min: 0, max: 100, step: 5, section: "thresholds", hint: "Share of the metric's highest value (load: percent)", visibleIf: (v) => v.shape === "grid" }),
];

export default defineWidget({
  meta,
  // A dense view of its own, no summary card.
  inspector: { header: "yes", compact: DENSE },
  settings,
  render: {
    load: () => import("./CoreHeatmap"),
    toProps: (s: ModuleSettings): Partial<CoreHeatmapProps> => ({
      cpu: deviceOf(s, "cpu"),
      shape: oneOf(s.shape, ["grid", "hex", "radial", "waterfall"]),
      metric: oneOf(s.metric, ["load", "clock", "power", "vid"]),
      ramp: oneOf(s.ramp, RAMPS),
      showValues: s.showValues === "on" ? true : s.showValues === "off" ? false : undefined,
      history: numberOf(s.history),
      hotOutline: numberOf(s.hotOutline),
    }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 device key `cpu` and no-card entry;
  // the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
