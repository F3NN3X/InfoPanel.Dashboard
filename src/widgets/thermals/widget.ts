// Thermals: every temperature sensor, hottest first. What the registry needs; the component is its own chunk.
import { tempUnitOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { defineWidget } from "../define";
import { THERMALS_SETTINGS } from "../shared/hardware-settings";
import { boolOf, boolSetting, enumSetting, formatSetting, numberOf, numberSetting, oneOf, optionPairs as opts, stringOf, thresholdSetting } from "../shared/settings-kit";
import type { ThermalsProps } from "./Thermals";
import { meta } from "./meta";

/** After the view / discover / fan settings it shares with the old Hardware widget (shared/hardware-settings.ts). */
const settings: ModuleSetting[] = [
  ...THERMALS_SETTINGS,
  enumSetting("sortBy", "Order", "hottest", opts(["hottest", "Hottest first"], ["fixed", "Fixed"]), { group: "Sorting", tab: "behaviour" }),
  numberSetting("max", "Bar scale (°C)", 100, { min: 40, max: 150, step: 5, group: "Bar scale", tab: "data" }),
  // Replaces "0 = per sensor" (config v7, owner decision Q3): on, each sensor keeps its own limits.
  boolSetting("sensorLimits", "Use sensor limits", true, { section: "thresholds", hint: "Each sensor's own warning and critical levels; off: the Temperature threshold for every sensor" }),
  thresholdSetting("temp", { visibleIf: (v) => v.sensorLimits === false }),
  formatSetting("tempUnit"),
];
/** The temperature levels: none while each sensor keeps its own limits, else the threshold. */
const thermalLevels = (s: ModuleSettings): { warn?: number; crit?: number } => (s.sensorLimits === false ? thresholdsOf(s, "temp") : {});

export default defineWidget({
  meta,
  // A summary card and a dense view of its own; the temperature unit and the Temperature threshold.
  inspector: { header: "yes", compact: { card: true, dense: true }, fmt: ["tempUnit"], thr: ["temp"] },
  settings,
  render: {
    load: () => import("./Thermals"),
    toProps: (s: ModuleSettings): Partial<ThermalsProps> => ({
      sortBy: oneOf(s.sortBy, ["hottest", "fixed"]),
      max: numberOf(s.max),
      ...thermalLevels(s),
      tempUnit: tempUnitOf(s),
      view: oneOf(s.view, ["bars", "gauges"]),
      discover: boolOf(s.discover),
      showFans: boolOf(s.showFans),
      fanColor: stringOf(s.fanColor),
    }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 levels (`sensorLimits`) and the v8
  // fan colour role; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
