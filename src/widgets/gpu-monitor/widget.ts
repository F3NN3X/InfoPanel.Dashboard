// GPU Monitor: load, temperature, power, VRAM, clocks and fans of one graphics card, with the GPU Rings as one of its views.
// What the registry needs; the component is its own chunk.
import { deviceOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { CARD, DENSE, defineWidget } from "../define";
import { colorSetting, colorsOf, deviceSetting, enumSetting, oneOf, thresholdSetting, viewOnly, viewSetting, type ColorEntry } from "../shared/settings-kit";
import type { GpuMonitorWidgetProps } from "./GpuMonitor";
import { meta } from "./meta";

const OUTER = ["vram", "load", "power"] as const;
const INNER = ["load", "vram", "fan"] as const;

const RING_COLORS: ColorEntry[] = [
  { entry: "outer", key: "outerColor", label: "Outer ring" },
  { entry: "inner", key: "innerColor", label: "Inner ring" },
];
/** The rings follow the theme's Series 1 and 2 ("" = the widget's own colours). */
const RING_ROLES = { outerColor: "s1", innerColor: "s2" } as const;

const monitorOnly = viewOnly(meta, "monitor");
/** The rings view is the GPU Rings widget: its two rings and their colours. */
const ringsOnly = viewOnly(meta, "rings");

const ringRows: ModuleSetting[] = [
  enumSetting("outer", "Outer ring", "vram", [{ value: "vram", label: "VRAM" }, { value: "load", label: "Load" }, { value: "power", label: "Power" }], { group: "Rings" }),
  enumSetting("inner", "Inner ring", "load", [{ value: "load", label: "Load" }, { value: "vram", label: "VRAM" }, { value: "fan", label: "Fan" }], { group: "Rings" }),
  ...RING_COLORS.map((e) => colorSetting(e.key, e.label, { role: RING_ROLES[e.key as keyof typeof RING_ROLES], more: false })),
];

export default defineWidget({
  meta,
  // A summary card and the Temperature threshold; the rings view has no card (the GPU Rings widget's dense view only) and
  // its Temperature levels row is the monitor view's.
  inspector: { header: "yes", compact: CARD, thr: ["temp"], byView: { rings: { compact: DENSE } } },
  settings: [
    viewSetting(meta, { group: "Display" }),
    ...ringRows.map(ringsOnly),
    deviceSetting("Graphics card", "gpu", { group: "Graphics card" }),
    monitorOnly(thresholdSetting("temp")),
  ],
  render: {
    load: () => import("./GpuMonitor"),
    toProps: (s: ModuleSettings): Partial<GpuMonitorWidgetProps> => {
      if (s.view === "rings") return { view: "rings", gpu: deviceOf(s, "gpu"), outer: oneOf(s.outer, OUTER), inner: oneOf(s.inner, INNER), colors: colorsOf(s, RING_COLORS) };
      const { warn, crit } = thresholdsOf(s, "temp", ["warnTemp", "critTemp"]);
      return { gpu: deviceOf(s, "gpu"), warnTemp: warn, critTemp: crit };
    },
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 Temperature levels, device key `gpu`,
  // the no-card set and the v8 colour roles, and config v19 (settings-migrate.v19.ts) made every GPU Rings placement this
  // widget's rings view; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
